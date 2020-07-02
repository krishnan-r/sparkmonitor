snap-points-2d
==============
Runs iterative snap rounding on a set of 2D coordinates to produce a hierarchical level of detail for optimizing online rendering of huge 2D plots.

# Install

```
npm i snap-points-2d
```

# API

#### `var hlod = require('snap-points-2d')(points, ids, weights, [, bounds])`
Reorders the points hierarchically such that those which are drawn at the same pixel coordinate are grouped together.

* `points` is an array of 2*n values
* `ids` is an array which gets the reordered index of the points
* `weights` is an array of point weights, which can be used for transparent rendering
* `bounds` is an optional array of 4 values giving the bounding box of the points

**Returns** An array of LOD scales.  Each record is an object with the following properties:

* `pixelSize` the pixel size of this level of detail in data units
* `offset` the offset of this lod within the output array
* `count` the number of items in the lod

**Note** the points in `output` are rescaled to the unit box `[0,1]x[0,1]` and the array `points` in the input is shuffled during execution.

# License
(c) 2015 Mikola Lysenko. MIT License
