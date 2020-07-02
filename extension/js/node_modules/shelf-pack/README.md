[![npm version](https://badge.fury.io/js/shelf-pack.svg)](https://badge.fury.io/js/shelf-pack)
[![Build Status](https://circleci.com/gh/mapbox/shelf-pack.svg?style=svg)](https://circleci.com/gh/mapbox/shelf-pack)

## shelf-pack

A 2D rectangular [bin packing](https://en.wikipedia.org/wiki/Bin_packing_problem)
data structure that uses the Shelf Best Height Fit heuristic.


### What is it?

`shelf-pack` is a library for packing little rectangles into a big rectangle.  This sounds simple enough,
but finding an optimal packing is a problem with [NP-Complete](https://en.wikipedia.org/wiki/NP-completeness)
complexity.  One useful application of bin packing is to assemble icons or glyphs into a sprite texture.

There are many ways to approach the bin packing problem, but `shelf-pack` uses the Shelf Best
Height Fit heuristic.  It works by dividing the total space into "shelves", each with a certain height.
The allocator packs rectangles onto whichever shelf minimizes the amount of wasted vertical space.

`shelf-pack` is simple, fast, and works best when the rectangles have similar heights (icons and glyphs
are like this).  It is not a generalized bin packer, and can potentially waste a lot of space if the
rectangles vary significantly in height.


### How fast is it?

Really fast!  `shelf-pack` is several orders of magnitude faster than the more general
[`bin-pack`](https://www.npmjs.com/package/bin-pack) library.

```bash
> npm run bench

ShelfPack allocate fixed bins x 1,923 ops/sec ±1.44% (85 runs sampled)
ShelfPack allocate random width bins x 1,707 ops/sec ±1.39% (84 runs sampled)
ShelfPack allocate random height bins x 1,632 ops/sec ±2.07% (86 runs sampled)
ShelfPack allocate random height and width bins x 1,212 ops/sec ±0.81% (89 runs sampled)
BinPack allocate fixed bins x 2.26 ops/sec ±6.89% (10 runs sampled)
BinPack allocate random width bins x 2.22 ops/sec ±7.21% (10 runs sampled)
BinPack allocate random height bins x 2.21 ops/sec ±7.34% (10 runs sampled)
BinPack allocate random height and width bins x 1.95 ops/sec ±4.81% (9 runs sampled)
```


### Usage

#### Basic

```js
var ShelfPack = require('shelf-pack');

// Initialize the sprite with a width and height..
var sprite = new ShelfPack(64, 64);

// Pack bins one at a time..
for (var i = 0; i < 5; i++) {
    var bin = sprite.packOne(32, 32);   // request width, height
    // returns an bin object with `x`, `y`, `w`, `h`, `width`, `height` properties..

    if (bin) {
        console.log('bin packed at ' + bin.x + ', ' + bin.y);
    } else {
        console.log('out of space');
    }
}

// Clear sprite and start over..
sprite.clear();

// Or, resize sprite by passing larger dimensions..
sprite.resize(128, 128);   // width, height

```


#### Batch packing

```js
var ShelfPack = require('shelf-pack');

// If you don't want to think about the size of the sprite,
// the `autoResize` option will allow it to grow as needed..
var sprite = new ShelfPack(10, 10, { autoResize: true });

// Bins can be allocated in batches..
// Each bin should have `width`, `height` (or `w`, `h`) properties..
var bins = [
    { id: 'a', width: 10, height: 10 },
    { id: 'b', width: 10, height: 12 },
    { id: 'c', w: 10, h: 12 },
    { id: 'd', w: 10, h: 10 }
];

var results = sprite.pack(bins);
// returns an Array of packed bins objects with `x`, `y`, `w`, `h`, `width`, `height` properties..

results.forEach(function(bin) {
    console.log('bin packed at ' + bin.x + ', ' + bin.y);
});


// If you don't mind letting ShelfPack modify your objects,
// the `inPlace` option will decorate your bin objects with `x` and `y` properties.
// Fancy!
var moreBins = [
    { id: 'e', width: 12, height: 24 },
    { id: 'f', width: 12, height: 12 },
    { id: 'g', w: 10, h: 10 }
];

sprite.pack(moreBins, { inPlace: true });
moreBins.forEach(function(bin) {
    console.log('bin packed at ' + bin.x + ', ' + bin.y);
});


```

### Documentation

Complete API documentation is here:  http://mapbox.github.io/shelf-pack/docs/


### See also

J. Jylänky, "A Thousand Ways to Pack the Bin - A Practical
Approach to Two-Dimensional Rectangle Bin Packing,"
http://clb.demon.fi/files/RectangleBinPack.pdf, 2010
