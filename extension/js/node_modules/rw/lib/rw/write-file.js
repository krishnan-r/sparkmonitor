var fs = require("fs"),
    encode = require("./encode");

module.exports = function(filename, data, options, callback) {
  if (arguments.length < 3) callback = options, options = null;
  fs.stat(filename, function(error, stat) {
    if (error && error.code !== "ENOENT") return callback(error);
    if (!stat || stat.isFile()) {
      fs.writeFile(filename, data, options, callback);
    } else {
      fs.createWriteStream(filename, options && {flags: options.flag || "w"}) // N.B. flag / flags
          .on("error", function(error) { callback(error.code === "EPIPE" ? null : error); }) // ignore broken pipe, e.g., | head
          .end(encode(data, options), callback);
    }
  });
};
