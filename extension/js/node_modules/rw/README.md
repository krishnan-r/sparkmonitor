# stdin & stdout, the right way

How do you read a file from stdin? If you thought,

```js
var contents = fs.readFileSync("/dev/stdin", "utf8");
```

you’d be wrong, because Node only reads up to the size of the file reported by fs.stat rather than reading until it receives an EOF. So, if you redirect a file to your program (`cat file | program`), you’ll only read the first 65,536 bytes of your file. Oops.

What about writing a file to stdout? If you thought,

```js
fs.writeFileSync("/dev/stdout", contents, "utf8");
```

you’d also be wrong, because this tries to close stdout, so you get this error:

```
Error: UNKNOWN, unknown error
    at Object.fs.writeSync (fs.js:528:18)
    at Object.fs.writeFileSync (fs.js:975:21)
```

Shucks. So what should you do?

You could use a different pattern for reading from stdin:

```js
var chunks = [];

process.stdin
    .on("data", function(chunk) { chunks.push(chunk); })
    .on("end", function() { console.log(chunks.join("").length); })
    .setEncoding("utf8");
```

But that’s a pain, since now your code has two different code paths for reading inputs depending on whether you’re reading a real file or stdin. And the code gets even more complex if you want to [read that file synchronously](https://github.com/mbostock/rw/blob/master/lib/rw/read-file-sync.js).

You could also try a different pattern for writing to stdout:

```js
process.stdout.write(contents);
```

Or even:

```js
console.log(contents);
```

But if you try to pipe your output to `head`, you’ll get this error:

```
Error: write EPIPE
    at errnoException (net.js:904:11)
    at Object.afterWrite (net.js:720:19)
```

Huh.

## rw

The **rw** module fixes these problems. It provides an interface just like readFile, readFileSync, writeFile and writeFileSync, but with implementations that work the way you expect on stdin and stdout. If you use these methods on files other than /dev/stdin or /dev/stdout, they simply delegate to the fs methods, so you can trust that they behave identically to the methods you’re used to.

For example, now you can read stdin synchronously like so:

```js
var contents = rw.readFileSync("/dev/stdin", "utf8");
```

Or to write to stdout:

```js
rw.writeFileSync("/dev/stdout", contents, "utf8");
```

And rw automatically squashes EPIPE errors, so you can pipe the output of your program to `head` and you won’t get a spurious stack trace.

To install, `npm install rw`.
