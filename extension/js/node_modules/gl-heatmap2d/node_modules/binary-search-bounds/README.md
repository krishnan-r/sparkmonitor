binary-search-bounds
====================
Binary search on arrays for predecessor, successor and range queries.

### Rationale

The main reason for using a [binary search](https://en.wikipedia.org/wiki/Binary_search_algorithm) or ordered set data structure instead of a hash map is to support fast predecessor/successor queries.  Besides this library, I am aware of no other modules on npm which implement these semantics (making them effectively useless)!!!  `binary-search-bounds` corrects this sad state of affairs.

## Example

```javascript
//Import module
var bounds = require('binary-search-bounds')

//Create an array
var array = [1, 2, 3, 3, 3, 5, 6, 10, 11, 13, 50, 1000, 2200]

//Print all elements in array contained in the interval [3, 50)
console.log(
  array.slice(
    bounds.ge(array, 3),
    bounds.lt(array, 50)))

//Test if array contains the element 4
console.log('indexOf(6)=', bounds.eq(array, 6))
console.log('indexOf(4)=', bounds.eq(array, 4))

//Find the element immediately after 13
console.log('successor of 13 = ', array[bounds.gt(array, 13)])

//Find the element in the array before 4
console.log('predecessor of 4 = ', array[bounds.lt(array, 4)])
```

#### Output:

```
[ 3, 3, 3, 5, 6, 10, 11 ]
indexOf(6)= 6
indexOf(4)= -1
successor of 13 =  50
predecessor of 4 =  3
```

## Install
Using [npm](https://docs.npmjs.com/), you can install the library as follows:

```
npm install binary-search-bounds
```

This module works great with [browserify](http://browserify.org/) if you want to use it in front end projects.

## API

```javascript
var bounds = require('binary-search-bounds')
```

#### `bounds.lt(array, y[, cmp, lo, hi])`
Returns the index of the last item in the array `<` y.  This is the same as a predecessor query.

#### `bounds.le(array, y[, cmp, lo, hi])`
Returns the index of the last item in the array `<=` y.  This is a predecessor query which also returns the item if present.

#### `bounds.gt(array, y[, cmp, lo, hi])`
Returns the index of the first item in the array `>` y.  This is the same as a successor query.

#### `bounds.ge(array, y[, cmp, lo, hi])`
Returns the index of the first item in the array `>=` y.  This is a successor query which also returns the item if present.

#### `bounds.eq(array, y[, cmp, lo, hi])`
Returns an index of some item in the array `== y` or `-1` if the item is not presetn.

### Notes

The following comments apply to the above methods:

* `cmp` is a comparison function, just like what you would pass to `Array.sort()`
* `y` will always be the second argument passed to `cmp`, so you can ignore it if you are just binary searching on a predicate.
* Assumes the array is sorted as would be the case if you called `Array.sort(cmp)` on it
* If no comparison is passed, assume array is sorted in ascending order (note this is different than the semantics of Array.sort() which converts all entries to strings if you don't pass an argument)
* `lo` gives a lower bound on the array index to search.  If not specified defaults to 0.
* `hi` gives an upper bound on the array index to search.  If not specified defaults to `array.length-1`
* Bouth bounds are inclusive.
* `bounds.le` and `bounds.lt` will return `lo - 1` if no element is found that `==y`
* `bounds.ge` and `bounds.gt` will return `hi + 1` if no element is found that `==y`
* `bounds.eq` will return `-1` if no element matching `y` is found.
* `bounds.eq` will return the first found item with the given index.  It can be a little faster than the other methods if you just want to find some random match and do not care where it is.

## Credits
(c) 2013 Mikola Lysenko. MIT License
