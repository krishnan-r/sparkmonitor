(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.geojsonvt = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

module.exports = clip;

var createFeature = require('./feature');

/* clip features between two axis-parallel lines:
 *     |        |
 *  ___|___     |     /
 * /   |   \____|____/
 *     |        |
 */

function clip(features, scale, k1, k2, axis, intersect, minAll, maxAll) {

    k1 /= scale;
    k2 /= scale;

    if (minAll >= k1 && maxAll <= k2) return features; // trivial accept
    else if (minAll > k2 || maxAll < k1) return null; // trivial reject

    var clipped = [];

    for (var i = 0; i < features.length; i++) {

        var feature = features[i],
            geometry = feature.geometry,
            type = feature.type,
            min, max;

        min = feature.min[axis];
        max = feature.max[axis];

        if (min >= k1 && max <= k2) { // trivial accept
            clipped.push(feature);
            continue;
        } else if (min > k2 || max < k1) continue; // trivial reject

        var slices = type === 1 ?
                clipPoints(geometry, k1, k2, axis) :
                clipGeometry(geometry, k1, k2, axis, intersect, type === 3);

        if (slices.length) {
            // if a feature got clipped, it will likely get clipped on the next zoom level as well,
            // so there's no need to recalculate bboxes
            clipped.push(createFeature(feature.tags, type, slices, feature.id));
        }
    }

    return clipped.length ? clipped : null;
}

function clipPoints(geometry, k1, k2, axis) {
    var slice = [];

    for (var i = 0; i < geometry.length; i++) {
        var a = geometry[i],
            ak = a[axis];

        if (ak >= k1 && ak <= k2) slice.push(a);
    }
    return slice;
}

function clipGeometry(geometry, k1, k2, axis, intersect, closed) {

    var slices = [];

    for (var i = 0; i < geometry.length; i++) {

        var ak = 0,
            bk = 0,
            b = null,
            points = geometry[i],
            area = points.area,
            dist = points.dist,
            outer = points.outer,
            len = points.length,
            a, j, last;

        var slice = [];

        for (j = 0; j < len - 1; j++) {
            a = b || points[j];
            b = points[j + 1];
            ak = bk || a[axis];
            bk = b[axis];

            if (ak < k1) {

                if ((bk > k2)) { // ---|-----|-->
                    slice.push(intersect(a, b, k1), intersect(a, b, k2));
                    if (!closed) slice = newSlice(slices, slice, area, dist, outer);

                } else if (bk >= k1) slice.push(intersect(a, b, k1)); // ---|-->  |

            } else if (ak > k2) {

                if ((bk < k1)) { // <--|-----|---
                    slice.push(intersect(a, b, k2), intersect(a, b, k1));
                    if (!closed) slice = newSlice(slices, slice, area, dist, outer);

                } else if (bk <= k2) slice.push(intersect(a, b, k2)); // |  <--|---

            } else {

                slice.push(a);

                if (bk < k1) { // <--|---  |
                    slice.push(intersect(a, b, k1));
                    if (!closed) slice = newSlice(slices, slice, area, dist, outer);

                } else if (bk > k2) { // |  ---|-->
                    slice.push(intersect(a, b, k2));
                    if (!closed) slice = newSlice(slices, slice, area, dist, outer);
                }
                // | --> |
            }
        }

        // add the last point
        a = points[len - 1];
        ak = a[axis];
        if (ak >= k1 && ak <= k2) slice.push(a);

        // close the polygon if its endpoints are not the same after clipping

        last = slice[slice.length - 1];
        if (closed && last && (slice[0][0] !== last[0] || slice[0][1] !== last[1])) slice.push(slice[0]);

        // add the final slice
        newSlice(slices, slice, area, dist, outer);
    }

    return slices;
}

function newSlice(slices, slice, area, dist, outer) {
    if (slice.length) {
        // we don't recalculate the area/length of the unclipped geometry because the case where it goes
        // below the visibility threshold as a result of clipping is rare, so we avoid doing unnecessary work
        slice.area = area;
        slice.dist = dist;
        if (outer !== undefined) slice.outer = outer;

        slices.push(slice);
    }
    return [];
}

},{"./feature":3}],2:[function(require,module,exports){
'use strict';

module.exports = convert;

var simplify = require('./simplify');
var createFeature = require('./feature');

// converts GeoJSON feature into an intermediate projected JSON vector format with simplification data

function convert(data, tolerance) {
    var features = [];

    if (data.type === 'FeatureCollection') {
        for (var i = 0; i < data.features.length; i++) {
            convertFeature(features, data.features[i], tolerance);
        }
    } else if (data.type === 'Feature') {
        convertFeature(features, data, tolerance);

    } else {
        // single geometry or a geometry collection
        convertFeature(features, {geometry: data}, tolerance);
    }
    return features;
}

function convertFeature(features, feature, tolerance) {
    if (feature.geometry === null) {
        // ignore features with null geometry
        return;
    }

    var geom = feature.geometry,
        type = geom.type,
        coords = geom.coordinates,
        tags = feature.properties,
        id = feature.id,
        i, j, rings, projectedRing;

    if (type === 'Point') {
        features.push(createFeature(tags, 1, [projectPoint(coords)], id));

    } else if (type === 'MultiPoint') {
        features.push(createFeature(tags, 1, project(coords), id));

    } else if (type === 'LineString') {
        features.push(createFeature(tags, 2, [project(coords, tolerance)], id));

    } else if (type === 'MultiLineString' || type === 'Polygon') {
        rings = [];
        for (i = 0; i < coords.length; i++) {
            projectedRing = project(coords[i], tolerance);
            if (type === 'Polygon') projectedRing.outer = (i === 0);
            rings.push(projectedRing);
        }
        features.push(createFeature(tags, type === 'Polygon' ? 3 : 2, rings, id));

    } else if (type === 'MultiPolygon') {
        rings = [];
        for (i = 0; i < coords.length; i++) {
            for (j = 0; j < coords[i].length; j++) {
                projectedRing = project(coords[i][j], tolerance);
                projectedRing.outer = (j === 0);
                rings.push(projectedRing);
            }
        }
        features.push(createFeature(tags, 3, rings, id));

    } else if (type === 'GeometryCollection') {
        for (i = 0; i < geom.geometries.length; i++) {
            convertFeature(features, {
                geometry: geom.geometries[i],
                properties: tags
            }, tolerance);
        }

    } else {
        throw new Error('Input data is not a valid GeoJSON object.');
    }
}

function project(lonlats, tolerance) {
    var projected = [];
    for (var i = 0; i < lonlats.length; i++) {
        projected.push(projectPoint(lonlats[i]));
    }
    if (tolerance) {
        simplify(projected, tolerance);
        calcSize(projected);
    }
    return projected;
}

function projectPoint(p) {
    var sin = Math.sin(p[1] * Math.PI / 180),
        x = (p[0] / 360 + 0.5),
        y = (0.5 - 0.25 * Math.log((1 + sin) / (1 - sin)) / Math.PI);

    y = y < 0 ? 0 :
        y > 1 ? 1 : y;

    return [x, y, 0];
}

// calculate area and length of the poly
function calcSize(points) {
    var area = 0,
        dist = 0;

    for (var i = 0, a, b; i < points.length - 1; i++) {
        a = b || points[i];
        b = points[i + 1];

        area += a[0] * b[1] - b[0] * a[1];

        // use Manhattan distance instead of Euclidian one to avoid expensive square root computation
        dist += Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
    }
    points.area = Math.abs(area / 2);
    points.dist = dist;
}

},{"./feature":3,"./simplify":5}],3:[function(require,module,exports){
'use strict';

module.exports = createFeature;

function createFeature(tags, type, geom, id) {
    var feature = {
        id: id || null,
        type: type,
        geometry: geom,
        tags: tags || null,
        min: [Infinity, Infinity], // initial bbox values
        max: [-Infinity, -Infinity]
    };
    calcBBox(feature);
    return feature;
}

// calculate the feature bounding box for faster clipping later
function calcBBox(feature) {
    var geometry = feature.geometry,
        min = feature.min,
        max = feature.max;

    if (feature.type === 1) {
        calcRingBBox(min, max, geometry);
    } else {
        for (var i = 0; i < geometry.length; i++) {
            calcRingBBox(min, max, geometry[i]);
        }
    }

    return feature;
}

function calcRingBBox(min, max, points) {
    for (var i = 0, p; i < points.length; i++) {
        p = points[i];
        min[0] = Math.min(p[0], min[0]);
        max[0] = Math.max(p[0], max[0]);
        min[1] = Math.min(p[1], min[1]);
        max[1] = Math.max(p[1], max[1]);
    }
}

},{}],4:[function(require,module,exports){
'use strict';

module.exports = geojsonvt;

var convert = require('./convert'),     // GeoJSON conversion and preprocessing
    transform = require('./transform'), // coordinate transformation
    clip = require('./clip'),           // stripe clipping algorithm
    wrap = require('./wrap'),           // date line processing
    createTile = require('./tile');     // final simplified tile generation


function geojsonvt(data, options) {
    return new GeoJSONVT(data, options);
}

function GeoJSONVT(data, options) {
    options = this.options = extend(Object.create(this.options), options);

    var debug = options.debug;

    if (debug) console.time('preprocess data');

    var z2 = 1 << options.maxZoom, // 2^z
        features = convert(data, options.tolerance / (z2 * options.extent));

    this.tiles = {};
    this.tileCoords = [];

    if (debug) {
        console.timeEnd('preprocess data');
        console.log('index: maxZoom: %d, maxPoints: %d', options.indexMaxZoom, options.indexMaxPoints);
        console.time('generate tiles');
        this.stats = {};
        this.total = 0;
    }

    features = wrap(features, options.buffer / options.extent, intersectX);

    // start slicing from the top tile down
    if (features.length) this.splitTile(features, 0, 0, 0);

    if (debug) {
        if (features.length) console.log('features: %d, points: %d', this.tiles[0].numFeatures, this.tiles[0].numPoints);
        console.timeEnd('generate tiles');
        console.log('tiles generated:', this.total, JSON.stringify(this.stats));
    }
}

GeoJSONVT.prototype.options = {
    maxZoom: 14,            // max zoom to preserve detail on
    indexMaxZoom: 5,        // max zoom in the tile index
    indexMaxPoints: 100000, // max number of points per tile in the tile index
    solidChildren: false,   // whether to tile solid square tiles further
    tolerance: 3,           // simplification tolerance (higher means simpler)
    extent: 4096,           // tile extent
    buffer: 64,             // tile buffer on each side
    debug: 0                // logging level (0, 1 or 2)
};

GeoJSONVT.prototype.splitTile = function (features, z, x, y, cz, cx, cy) {

    var stack = [features, z, x, y],
        options = this.options,
        debug = options.debug,
        solid = null;

    // avoid recursion by using a processing queue
    while (stack.length) {
        y = stack.pop();
        x = stack.pop();
        z = stack.pop();
        features = stack.pop();

        var z2 = 1 << z,
            id = toID(z, x, y),
            tile = this.tiles[id],
            tileTolerance = z === options.maxZoom ? 0 : options.tolerance / (z2 * options.extent);

        if (!tile) {
            if (debug > 1) console.time('creation');

            tile = this.tiles[id] = createTile(features, z2, x, y, tileTolerance, z === options.maxZoom);
            this.tileCoords.push({z: z, x: x, y: y});

            if (debug) {
                if (debug > 1) {
                    console.log('tile z%d-%d-%d (features: %d, points: %d, simplified: %d)',
                        z, x, y, tile.numFeatures, tile.numPoints, tile.numSimplified);
                    console.timeEnd('creation');
                }
                var key = 'z' + z;
                this.stats[key] = (this.stats[key] || 0) + 1;
                this.total++;
            }
        }

        // save reference to original geometry in tile so that we can drill down later if we stop now
        tile.source = features;

        // if it's the first-pass tiling
        if (!cz) {
            // stop tiling if we reached max zoom, or if the tile is too simple
            if (z === options.indexMaxZoom || tile.numPoints <= options.indexMaxPoints) continue;

        // if a drilldown to a specific tile
        } else {
            // stop tiling if we reached base zoom or our target tile zoom
            if (z === options.maxZoom || z === cz) continue;

            // stop tiling if it's not an ancestor of the target tile
            var m = 1 << (cz - z);
            if (x !== Math.floor(cx / m) || y !== Math.floor(cy / m)) continue;
        }

        // stop tiling if the tile is solid clipped square
        if (!options.solidChildren && isClippedSquare(tile, options.extent, options.buffer)) {
            if (cz) solid = z; // and remember the zoom if we're drilling down
            continue;
        }

        // if we slice further down, no need to keep source geometry
        tile.source = null;

        if (debug > 1) console.time('clipping');

        // values we'll use for clipping
        var k1 = 0.5 * options.buffer / options.extent,
            k2 = 0.5 - k1,
            k3 = 0.5 + k1,
            k4 = 1 + k1,
            tl, bl, tr, br, left, right;

        tl = bl = tr = br = null;

        left  = clip(features, z2, x - k1, x + k3, 0, intersectX, tile.min[0], tile.max[0]);
        right = clip(features, z2, x + k2, x + k4, 0, intersectX, tile.min[0], tile.max[0]);

        if (left) {
            tl = clip(left, z2, y - k1, y + k3, 1, intersectY, tile.min[1], tile.max[1]);
            bl = clip(left, z2, y + k2, y + k4, 1, intersectY, tile.min[1], tile.max[1]);
        }

        if (right) {
            tr = clip(right, z2, y - k1, y + k3, 1, intersectY, tile.min[1], tile.max[1]);
            br = clip(right, z2, y + k2, y + k4, 1, intersectY, tile.min[1], tile.max[1]);
        }

        if (debug > 1) console.timeEnd('clipping');

        if (features.length) {
            stack.push(tl || [], z + 1, x * 2,     y * 2);
            stack.push(bl || [], z + 1, x * 2,     y * 2 + 1);
            stack.push(tr || [], z + 1, x * 2 + 1, y * 2);
            stack.push(br || [], z + 1, x * 2 + 1, y * 2 + 1);
        }
    }

    return solid;
};

GeoJSONVT.prototype.getTile = function (z, x, y) {
    var options = this.options,
        extent = options.extent,
        debug = options.debug;

    var z2 = 1 << z;
    x = ((x % z2) + z2) % z2; // wrap tile x coordinate

    var id = toID(z, x, y);
    if (this.tiles[id]) return transform.tile(this.tiles[id], extent);

    if (debug > 1) console.log('drilling down to z%d-%d-%d', z, x, y);

    var z0 = z,
        x0 = x,
        y0 = y,
        parent;

    while (!parent && z0 > 0) {
        z0--;
        x0 = Math.floor(x0 / 2);
        y0 = Math.floor(y0 / 2);
        parent = this.tiles[toID(z0, x0, y0)];
    }

    if (!parent || !parent.source) return null;

    // if we found a parent tile containing the original geometry, we can drill down from it
    if (debug > 1) console.log('found parent tile z%d-%d-%d', z0, x0, y0);

    // it parent tile is a solid clipped square, return it instead since it's identical
    if (isClippedSquare(parent, extent, options.buffer)) return transform.tile(parent, extent);

    if (debug > 1) console.time('drilling down');
    var solid = this.splitTile(parent.source, z0, x0, y0, z, x, y);
    if (debug > 1) console.timeEnd('drilling down');

    // one of the parent tiles was a solid clipped square
    if (solid !== null) {
        var m = 1 << (z - solid);
        id = toID(solid, Math.floor(x / m), Math.floor(y / m));
    }

    return this.tiles[id] ? transform.tile(this.tiles[id], extent) : null;
};

function toID(z, x, y) {
    return (((1 << z) * y + x) * 32) + z;
}

function intersectX(a, b, x) {
    return [x, (x - a[0]) * (b[1] - a[1]) / (b[0] - a[0]) + a[1], 1];
}
function intersectY(a, b, y) {
    return [(y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]) + a[0], y, 1];
}

function extend(dest, src) {
    for (var i in src) dest[i] = src[i];
    return dest;
}

// checks whether a tile is a whole-area fill after clipping; if it is, there's no sense slicing it further
function isClippedSquare(tile, extent, buffer) {

    var features = tile.source;
    if (features.length !== 1) return false;

    var feature = features[0];
    if (feature.type !== 3 || feature.geometry.length > 1) return false;

    var len = feature.geometry[0].length;
    if (len !== 5) return false;

    for (var i = 0; i < len; i++) {
        var p = transform.point(feature.geometry[0][i], extent, tile.z2, tile.x, tile.y);
        if ((p[0] !== -buffer && p[0] !== extent + buffer) ||
            (p[1] !== -buffer && p[1] !== extent + buffer)) return false;
    }

    return true;
}

},{"./clip":1,"./convert":2,"./tile":6,"./transform":7,"./wrap":8}],5:[function(require,module,exports){
'use strict';

module.exports = simplify;

// calculate simplification data using optimized Douglas-Peucker algorithm

function simplify(points, tolerance) {

    var sqTolerance = tolerance * tolerance,
        len = points.length,
        first = 0,
        last = len - 1,
        stack = [],
        i, maxSqDist, sqDist, index;

    // always retain the endpoints (1 is the max value)
    points[first][2] = 1;
    points[last][2] = 1;

    // avoid recursion by using a stack
    while (last) {

        maxSqDist = 0;

        for (i = first + 1; i < last; i++) {
            sqDist = getSqSegDist(points[i], points[first], points[last]);

            if (sqDist > maxSqDist) {
                index = i;
                maxSqDist = sqDist;
            }
        }

        if (maxSqDist > sqTolerance) {
            points[index][2] = maxSqDist; // save the point importance in squared pixels as a z coordinate
            stack.push(first);
            stack.push(index);
            first = index;

        } else {
            last = stack.pop();
            first = stack.pop();
        }
    }
}

// square distance from a point to a segment
function getSqSegDist(p, a, b) {

    var x = a[0], y = a[1],
        bx = b[0], by = b[1],
        px = p[0], py = p[1],
        dx = bx - x,
        dy = by - y;

    if (dx !== 0 || dy !== 0) {

        var t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy);

        if (t > 1) {
            x = bx;
            y = by;

        } else if (t > 0) {
            x += dx * t;
            y += dy * t;
        }
    }

    dx = px - x;
    dy = py - y;

    return dx * dx + dy * dy;
}

},{}],6:[function(require,module,exports){
'use strict';

module.exports = createTile;

function createTile(features, z2, tx, ty, tolerance, noSimplify) {
    var tile = {
        features: [],
        numPoints: 0,
        numSimplified: 0,
        numFeatures: 0,
        source: null,
        x: tx,
        y: ty,
        z2: z2,
        transformed: false,
        min: [2, 1],
        max: [-1, 0]
    };
    for (var i = 0; i < features.length; i++) {
        tile.numFeatures++;
        addFeature(tile, features[i], tolerance, noSimplify);

        var min = features[i].min,
            max = features[i].max;

        if (min[0] < tile.min[0]) tile.min[0] = min[0];
        if (min[1] < tile.min[1]) tile.min[1] = min[1];
        if (max[0] > tile.max[0]) tile.max[0] = max[0];
        if (max[1] > tile.max[1]) tile.max[1] = max[1];
    }
    return tile;
}

function addFeature(tile, feature, tolerance, noSimplify) {

    var geom = feature.geometry,
        type = feature.type,
        simplified = [],
        sqTolerance = tolerance * tolerance,
        i, j, ring, p;

    if (type === 1) {
        for (i = 0; i < geom.length; i++) {
            simplified.push(geom[i]);
            tile.numPoints++;
            tile.numSimplified++;
        }

    } else {

        // simplify and transform projected coordinates for tile geometry
        for (i = 0; i < geom.length; i++) {
            ring = geom[i];

            // filter out tiny polylines & polygons
            if (!noSimplify && ((type === 2 && ring.dist < tolerance) ||
                                (type === 3 && ring.area < sqTolerance))) {
                tile.numPoints += ring.length;
                continue;
            }

            var simplifiedRing = [];

            for (j = 0; j < ring.length; j++) {
                p = ring[j];
                // keep points with importance > tolerance
                if (noSimplify || p[2] > sqTolerance) {
                    simplifiedRing.push(p);
                    tile.numSimplified++;
                }
                tile.numPoints++;
            }

            if (type === 3) rewind(simplifiedRing, ring.outer);

            simplified.push(simplifiedRing);
        }
    }

    if (simplified.length) {
        var tileFeature = {
            geometry: simplified,
            type: type,
            tags: feature.tags || null
        };
        if (feature.id !== null) {
            tileFeature.id = feature.id;
        }
        tile.features.push(tileFeature);
    }
}

function rewind(ring, clockwise) {
    var area = signedArea(ring);
    if (area < 0 === clockwise) ring.reverse();
}

function signedArea(ring) {
    var sum = 0;
    for (var i = 0, len = ring.length, j = len - 1, p1, p2; i < len; j = i++) {
        p1 = ring[i];
        p2 = ring[j];
        sum += (p2[0] - p1[0]) * (p1[1] + p2[1]);
    }
    return sum;
}

},{}],7:[function(require,module,exports){
'use strict';

exports.tile = transformTile;
exports.point = transformPoint;

// Transforms the coordinates of each feature in the given tile from
// mercator-projected space into (extent x extent) tile space.
function transformTile(tile, extent) {
    if (tile.transformed) return tile;

    var z2 = tile.z2,
        tx = tile.x,
        ty = tile.y,
        i, j, k;

    for (i = 0; i < tile.features.length; i++) {
        var feature = tile.features[i],
            geom = feature.geometry,
            type = feature.type;

        if (type === 1) {
            for (j = 0; j < geom.length; j++) geom[j] = transformPoint(geom[j], extent, z2, tx, ty);

        } else {
            for (j = 0; j < geom.length; j++) {
                var ring = geom[j];
                for (k = 0; k < ring.length; k++) ring[k] = transformPoint(ring[k], extent, z2, tx, ty);
            }
        }
    }

    tile.transformed = true;

    return tile;
}

function transformPoint(p, extent, z2, tx, ty) {
    var x = Math.round(extent * (p[0] * z2 - tx)),
        y = Math.round(extent * (p[1] * z2 - ty));
    return [x, y];
}

},{}],8:[function(require,module,exports){
'use strict';

var clip = require('./clip');
var createFeature = require('./feature');

module.exports = wrap;

function wrap(features, buffer, intersectX) {
    var merged = features,
        left  = clip(features, 1, -1 - buffer, buffer,     0, intersectX, -1, 2), // left world copy
        right = clip(features, 1,  1 - buffer, 2 + buffer, 0, intersectX, -1, 2); // right world copy

    if (left || right) {
        merged = clip(features, 1, -buffer, 1 + buffer, 0, intersectX, -1, 2) || []; // center world copy

        if (left) merged = shiftFeatureCoords(left, 1).concat(merged); // merge left into center
        if (right) merged = merged.concat(shiftFeatureCoords(right, -1)); // merge right into center
    }

    return merged;
}

function shiftFeatureCoords(features, offset) {
    var newFeatures = [];

    for (var i = 0; i < features.length; i++) {
        var feature = features[i],
            type = feature.type;

        var newGeometry;

        if (type === 1) {
            newGeometry = shiftCoords(feature.geometry, offset);
        } else {
            newGeometry = [];
            for (var j = 0; j < feature.geometry.length; j++) {
                newGeometry.push(shiftCoords(feature.geometry[j], offset));
            }
        }

        newFeatures.push(createFeature(feature.tags, type, newGeometry, feature.id));
    }

    return newFeatures;
}

function shiftCoords(points, offset) {
    var newPoints = [];
    newPoints.area = points.area;
    newPoints.dist = points.dist;

    for (var i = 0; i < points.length; i++) {
        newPoints.push([points[i][0] + offset, points[i][1], points[i][2]]);
    }
    return newPoints;
}

},{"./clip":1,"./feature":3}]},{},[4])(4)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2xpcC5qcyIsInNyYy9jb252ZXJ0LmpzIiwic3JjL2ZlYXR1cmUuanMiLCJzcmMvaW5kZXguanMiLCJzcmMvc2ltcGxpZnkuanMiLCJzcmMvdGlsZS5qcyIsInNyYy90cmFuc2Zvcm0uanMiLCJzcmMvd3JhcC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBjbGlwO1xuXG52YXIgY3JlYXRlRmVhdHVyZSA9IHJlcXVpcmUoJy4vZmVhdHVyZScpO1xuXG4vKiBjbGlwIGZlYXR1cmVzIGJldHdlZW4gdHdvIGF4aXMtcGFyYWxsZWwgbGluZXM6XG4gKiAgICAgfCAgICAgICAgfFxuICogIF9fX3xfX18gICAgIHwgICAgIC9cbiAqIC8gICB8ICAgXFxfX19ffF9fX18vXG4gKiAgICAgfCAgICAgICAgfFxuICovXG5cbmZ1bmN0aW9uIGNsaXAoZmVhdHVyZXMsIHNjYWxlLCBrMSwgazIsIGF4aXMsIGludGVyc2VjdCwgbWluQWxsLCBtYXhBbGwpIHtcblxuICAgIGsxIC89IHNjYWxlO1xuICAgIGsyIC89IHNjYWxlO1xuXG4gICAgaWYgKG1pbkFsbCA+PSBrMSAmJiBtYXhBbGwgPD0gazIpIHJldHVybiBmZWF0dXJlczsgLy8gdHJpdmlhbCBhY2NlcHRcbiAgICBlbHNlIGlmIChtaW5BbGwgPiBrMiB8fCBtYXhBbGwgPCBrMSkgcmV0dXJuIG51bGw7IC8vIHRyaXZpYWwgcmVqZWN0XG5cbiAgICB2YXIgY2xpcHBlZCA9IFtdO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmZWF0dXJlcy5sZW5ndGg7IGkrKykge1xuXG4gICAgICAgIHZhciBmZWF0dXJlID0gZmVhdHVyZXNbaV0sXG4gICAgICAgICAgICBnZW9tZXRyeSA9IGZlYXR1cmUuZ2VvbWV0cnksXG4gICAgICAgICAgICB0eXBlID0gZmVhdHVyZS50eXBlLFxuICAgICAgICAgICAgbWluLCBtYXg7XG5cbiAgICAgICAgbWluID0gZmVhdHVyZS5taW5bYXhpc107XG4gICAgICAgIG1heCA9IGZlYXR1cmUubWF4W2F4aXNdO1xuXG4gICAgICAgIGlmIChtaW4gPj0gazEgJiYgbWF4IDw9IGsyKSB7IC8vIHRyaXZpYWwgYWNjZXB0XG4gICAgICAgICAgICBjbGlwcGVkLnB1c2goZmVhdHVyZSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmIChtaW4gPiBrMiB8fCBtYXggPCBrMSkgY29udGludWU7IC8vIHRyaXZpYWwgcmVqZWN0XG5cbiAgICAgICAgdmFyIHNsaWNlcyA9IHR5cGUgPT09IDEgP1xuICAgICAgICAgICAgICAgIGNsaXBQb2ludHMoZ2VvbWV0cnksIGsxLCBrMiwgYXhpcykgOlxuICAgICAgICAgICAgICAgIGNsaXBHZW9tZXRyeShnZW9tZXRyeSwgazEsIGsyLCBheGlzLCBpbnRlcnNlY3QsIHR5cGUgPT09IDMpO1xuXG4gICAgICAgIGlmIChzbGljZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBpZiBhIGZlYXR1cmUgZ290IGNsaXBwZWQsIGl0IHdpbGwgbGlrZWx5IGdldCBjbGlwcGVkIG9uIHRoZSBuZXh0IHpvb20gbGV2ZWwgYXMgd2VsbCxcbiAgICAgICAgICAgIC8vIHNvIHRoZXJlJ3Mgbm8gbmVlZCB0byByZWNhbGN1bGF0ZSBiYm94ZXNcbiAgICAgICAgICAgIGNsaXBwZWQucHVzaChjcmVhdGVGZWF0dXJlKGZlYXR1cmUudGFncywgdHlwZSwgc2xpY2VzLCBmZWF0dXJlLmlkKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY2xpcHBlZC5sZW5ndGggPyBjbGlwcGVkIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gY2xpcFBvaW50cyhnZW9tZXRyeSwgazEsIGsyLCBheGlzKSB7XG4gICAgdmFyIHNsaWNlID0gW107XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdlb21ldHJ5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBhID0gZ2VvbWV0cnlbaV0sXG4gICAgICAgICAgICBhayA9IGFbYXhpc107XG5cbiAgICAgICAgaWYgKGFrID49IGsxICYmIGFrIDw9IGsyKSBzbGljZS5wdXNoKGEpO1xuICAgIH1cbiAgICByZXR1cm4gc2xpY2U7XG59XG5cbmZ1bmN0aW9uIGNsaXBHZW9tZXRyeShnZW9tZXRyeSwgazEsIGsyLCBheGlzLCBpbnRlcnNlY3QsIGNsb3NlZCkge1xuXG4gICAgdmFyIHNsaWNlcyA9IFtdO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBnZW9tZXRyeS5sZW5ndGg7IGkrKykge1xuXG4gICAgICAgIHZhciBhayA9IDAsXG4gICAgICAgICAgICBiayA9IDAsXG4gICAgICAgICAgICBiID0gbnVsbCxcbiAgICAgICAgICAgIHBvaW50cyA9IGdlb21ldHJ5W2ldLFxuICAgICAgICAgICAgYXJlYSA9IHBvaW50cy5hcmVhLFxuICAgICAgICAgICAgZGlzdCA9IHBvaW50cy5kaXN0LFxuICAgICAgICAgICAgb3V0ZXIgPSBwb2ludHMub3V0ZXIsXG4gICAgICAgICAgICBsZW4gPSBwb2ludHMubGVuZ3RoLFxuICAgICAgICAgICAgYSwgaiwgbGFzdDtcblxuICAgICAgICB2YXIgc2xpY2UgPSBbXTtcblxuICAgICAgICBmb3IgKGogPSAwOyBqIDwgbGVuIC0gMTsgaisrKSB7XG4gICAgICAgICAgICBhID0gYiB8fCBwb2ludHNbal07XG4gICAgICAgICAgICBiID0gcG9pbnRzW2ogKyAxXTtcbiAgICAgICAgICAgIGFrID0gYmsgfHwgYVtheGlzXTtcbiAgICAgICAgICAgIGJrID0gYltheGlzXTtcblxuICAgICAgICAgICAgaWYgKGFrIDwgazEpIHtcblxuICAgICAgICAgICAgICAgIGlmICgoYmsgPiBrMikpIHsgLy8gLS0tfC0tLS0tfC0tPlxuICAgICAgICAgICAgICAgICAgICBzbGljZS5wdXNoKGludGVyc2VjdChhLCBiLCBrMSksIGludGVyc2VjdChhLCBiLCBrMikpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWNsb3NlZCkgc2xpY2UgPSBuZXdTbGljZShzbGljZXMsIHNsaWNlLCBhcmVhLCBkaXN0LCBvdXRlcik7XG5cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGJrID49IGsxKSBzbGljZS5wdXNoKGludGVyc2VjdChhLCBiLCBrMSkpOyAvLyAtLS18LS0+ICB8XG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYWsgPiBrMikge1xuXG4gICAgICAgICAgICAgICAgaWYgKChiayA8IGsxKSkgeyAvLyA8LS18LS0tLS18LS0tXG4gICAgICAgICAgICAgICAgICAgIHNsaWNlLnB1c2goaW50ZXJzZWN0KGEsIGIsIGsyKSwgaW50ZXJzZWN0KGEsIGIsIGsxKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghY2xvc2VkKSBzbGljZSA9IG5ld1NsaWNlKHNsaWNlcywgc2xpY2UsIGFyZWEsIGRpc3QsIG91dGVyKTtcblxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYmsgPD0gazIpIHNsaWNlLnB1c2goaW50ZXJzZWN0KGEsIGIsIGsyKSk7IC8vIHwgIDwtLXwtLS1cblxuICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgIHNsaWNlLnB1c2goYSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoYmsgPCBrMSkgeyAvLyA8LS18LS0tICB8XG4gICAgICAgICAgICAgICAgICAgIHNsaWNlLnB1c2goaW50ZXJzZWN0KGEsIGIsIGsxKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghY2xvc2VkKSBzbGljZSA9IG5ld1NsaWNlKHNsaWNlcywgc2xpY2UsIGFyZWEsIGRpc3QsIG91dGVyKTtcblxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYmsgPiBrMikgeyAvLyB8ICAtLS18LS0+XG4gICAgICAgICAgICAgICAgICAgIHNsaWNlLnB1c2goaW50ZXJzZWN0KGEsIGIsIGsyKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghY2xvc2VkKSBzbGljZSA9IG5ld1NsaWNlKHNsaWNlcywgc2xpY2UsIGFyZWEsIGRpc3QsIG91dGVyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gfCAtLT4gfFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gYWRkIHRoZSBsYXN0IHBvaW50XG4gICAgICAgIGEgPSBwb2ludHNbbGVuIC0gMV07XG4gICAgICAgIGFrID0gYVtheGlzXTtcbiAgICAgICAgaWYgKGFrID49IGsxICYmIGFrIDw9IGsyKSBzbGljZS5wdXNoKGEpO1xuXG4gICAgICAgIC8vIGNsb3NlIHRoZSBwb2x5Z29uIGlmIGl0cyBlbmRwb2ludHMgYXJlIG5vdCB0aGUgc2FtZSBhZnRlciBjbGlwcGluZ1xuXG4gICAgICAgIGxhc3QgPSBzbGljZVtzbGljZS5sZW5ndGggLSAxXTtcbiAgICAgICAgaWYgKGNsb3NlZCAmJiBsYXN0ICYmIChzbGljZVswXVswXSAhPT0gbGFzdFswXSB8fCBzbGljZVswXVsxXSAhPT0gbGFzdFsxXSkpIHNsaWNlLnB1c2goc2xpY2VbMF0pO1xuXG4gICAgICAgIC8vIGFkZCB0aGUgZmluYWwgc2xpY2VcbiAgICAgICAgbmV3U2xpY2Uoc2xpY2VzLCBzbGljZSwgYXJlYSwgZGlzdCwgb3V0ZXIpO1xuICAgIH1cblxuICAgIHJldHVybiBzbGljZXM7XG59XG5cbmZ1bmN0aW9uIG5ld1NsaWNlKHNsaWNlcywgc2xpY2UsIGFyZWEsIGRpc3QsIG91dGVyKSB7XG4gICAgaWYgKHNsaWNlLmxlbmd0aCkge1xuICAgICAgICAvLyB3ZSBkb24ndCByZWNhbGN1bGF0ZSB0aGUgYXJlYS9sZW5ndGggb2YgdGhlIHVuY2xpcHBlZCBnZW9tZXRyeSBiZWNhdXNlIHRoZSBjYXNlIHdoZXJlIGl0IGdvZXNcbiAgICAgICAgLy8gYmVsb3cgdGhlIHZpc2liaWxpdHkgdGhyZXNob2xkIGFzIGEgcmVzdWx0IG9mIGNsaXBwaW5nIGlzIHJhcmUsIHNvIHdlIGF2b2lkIGRvaW5nIHVubmVjZXNzYXJ5IHdvcmtcbiAgICAgICAgc2xpY2UuYXJlYSA9IGFyZWE7XG4gICAgICAgIHNsaWNlLmRpc3QgPSBkaXN0O1xuICAgICAgICBpZiAob3V0ZXIgIT09IHVuZGVmaW5lZCkgc2xpY2Uub3V0ZXIgPSBvdXRlcjtcblxuICAgICAgICBzbGljZXMucHVzaChzbGljZSk7XG4gICAgfVxuICAgIHJldHVybiBbXTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBjb252ZXJ0O1xuXG52YXIgc2ltcGxpZnkgPSByZXF1aXJlKCcuL3NpbXBsaWZ5Jyk7XG52YXIgY3JlYXRlRmVhdHVyZSA9IHJlcXVpcmUoJy4vZmVhdHVyZScpO1xuXG4vLyBjb252ZXJ0cyBHZW9KU09OIGZlYXR1cmUgaW50byBhbiBpbnRlcm1lZGlhdGUgcHJvamVjdGVkIEpTT04gdmVjdG9yIGZvcm1hdCB3aXRoIHNpbXBsaWZpY2F0aW9uIGRhdGFcblxuZnVuY3Rpb24gY29udmVydChkYXRhLCB0b2xlcmFuY2UpIHtcbiAgICB2YXIgZmVhdHVyZXMgPSBbXTtcblxuICAgIGlmIChkYXRhLnR5cGUgPT09ICdGZWF0dXJlQ29sbGVjdGlvbicpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmZlYXR1cmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb252ZXJ0RmVhdHVyZShmZWF0dXJlcywgZGF0YS5mZWF0dXJlc1tpXSwgdG9sZXJhbmNlKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZGF0YS50eXBlID09PSAnRmVhdHVyZScpIHtcbiAgICAgICAgY29udmVydEZlYXR1cmUoZmVhdHVyZXMsIGRhdGEsIHRvbGVyYW5jZSk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzaW5nbGUgZ2VvbWV0cnkgb3IgYSBnZW9tZXRyeSBjb2xsZWN0aW9uXG4gICAgICAgIGNvbnZlcnRGZWF0dXJlKGZlYXR1cmVzLCB7Z2VvbWV0cnk6IGRhdGF9LCB0b2xlcmFuY2UpO1xuICAgIH1cbiAgICByZXR1cm4gZmVhdHVyZXM7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRGZWF0dXJlKGZlYXR1cmVzLCBmZWF0dXJlLCB0b2xlcmFuY2UpIHtcbiAgICBpZiAoZmVhdHVyZS5nZW9tZXRyeSA9PT0gbnVsbCkge1xuICAgICAgICAvLyBpZ25vcmUgZmVhdHVyZXMgd2l0aCBudWxsIGdlb21ldHJ5XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgZ2VvbSA9IGZlYXR1cmUuZ2VvbWV0cnksXG4gICAgICAgIHR5cGUgPSBnZW9tLnR5cGUsXG4gICAgICAgIGNvb3JkcyA9IGdlb20uY29vcmRpbmF0ZXMsXG4gICAgICAgIHRhZ3MgPSBmZWF0dXJlLnByb3BlcnRpZXMsXG4gICAgICAgIGlkID0gZmVhdHVyZS5pZCxcbiAgICAgICAgaSwgaiwgcmluZ3MsIHByb2plY3RlZFJpbmc7XG5cbiAgICBpZiAodHlwZSA9PT0gJ1BvaW50Jykge1xuICAgICAgICBmZWF0dXJlcy5wdXNoKGNyZWF0ZUZlYXR1cmUodGFncywgMSwgW3Byb2plY3RQb2ludChjb29yZHMpXSwgaWQpKTtcblxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ011bHRpUG9pbnQnKSB7XG4gICAgICAgIGZlYXR1cmVzLnB1c2goY3JlYXRlRmVhdHVyZSh0YWdzLCAxLCBwcm9qZWN0KGNvb3JkcyksIGlkKSk7XG5cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdMaW5lU3RyaW5nJykge1xuICAgICAgICBmZWF0dXJlcy5wdXNoKGNyZWF0ZUZlYXR1cmUodGFncywgMiwgW3Byb2plY3QoY29vcmRzLCB0b2xlcmFuY2UpXSwgaWQpKTtcblxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ011bHRpTGluZVN0cmluZycgfHwgdHlwZSA9PT0gJ1BvbHlnb24nKSB7XG4gICAgICAgIHJpbmdzID0gW107XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBjb29yZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHByb2plY3RlZFJpbmcgPSBwcm9qZWN0KGNvb3Jkc1tpXSwgdG9sZXJhbmNlKTtcbiAgICAgICAgICAgIGlmICh0eXBlID09PSAnUG9seWdvbicpIHByb2plY3RlZFJpbmcub3V0ZXIgPSAoaSA9PT0gMCk7XG4gICAgICAgICAgICByaW5ncy5wdXNoKHByb2plY3RlZFJpbmcpO1xuICAgICAgICB9XG4gICAgICAgIGZlYXR1cmVzLnB1c2goY3JlYXRlRmVhdHVyZSh0YWdzLCB0eXBlID09PSAnUG9seWdvbicgPyAzIDogMiwgcmluZ3MsIGlkKSk7XG5cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdNdWx0aVBvbHlnb24nKSB7XG4gICAgICAgIHJpbmdzID0gW107XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBjb29yZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBjb29yZHNbaV0ubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBwcm9qZWN0ZWRSaW5nID0gcHJvamVjdChjb29yZHNbaV1bal0sIHRvbGVyYW5jZSk7XG4gICAgICAgICAgICAgICAgcHJvamVjdGVkUmluZy5vdXRlciA9IChqID09PSAwKTtcbiAgICAgICAgICAgICAgICByaW5ncy5wdXNoKHByb2plY3RlZFJpbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZlYXR1cmVzLnB1c2goY3JlYXRlRmVhdHVyZSh0YWdzLCAzLCByaW5ncywgaWQpKTtcblxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ0dlb21ldHJ5Q29sbGVjdGlvbicpIHtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGdlb20uZ2VvbWV0cmllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29udmVydEZlYXR1cmUoZmVhdHVyZXMsIHtcbiAgICAgICAgICAgICAgICBnZW9tZXRyeTogZ2VvbS5nZW9tZXRyaWVzW2ldLFxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHRhZ3NcbiAgICAgICAgICAgIH0sIHRvbGVyYW5jZSk7XG4gICAgICAgIH1cblxuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW5wdXQgZGF0YSBpcyBub3QgYSB2YWxpZCBHZW9KU09OIG9iamVjdC4nKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHByb2plY3QobG9ubGF0cywgdG9sZXJhbmNlKSB7XG4gICAgdmFyIHByb2plY3RlZCA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbG9ubGF0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBwcm9qZWN0ZWQucHVzaChwcm9qZWN0UG9pbnQobG9ubGF0c1tpXSkpO1xuICAgIH1cbiAgICBpZiAodG9sZXJhbmNlKSB7XG4gICAgICAgIHNpbXBsaWZ5KHByb2plY3RlZCwgdG9sZXJhbmNlKTtcbiAgICAgICAgY2FsY1NpemUocHJvamVjdGVkKTtcbiAgICB9XG4gICAgcmV0dXJuIHByb2plY3RlZDtcbn1cblxuZnVuY3Rpb24gcHJvamVjdFBvaW50KHApIHtcbiAgICB2YXIgc2luID0gTWF0aC5zaW4ocFsxXSAqIE1hdGguUEkgLyAxODApLFxuICAgICAgICB4ID0gKHBbMF0gLyAzNjAgKyAwLjUpLFxuICAgICAgICB5ID0gKDAuNSAtIDAuMjUgKiBNYXRoLmxvZygoMSArIHNpbikgLyAoMSAtIHNpbikpIC8gTWF0aC5QSSk7XG5cbiAgICB5ID0geSA8IDAgPyAwIDpcbiAgICAgICAgeSA+IDEgPyAxIDogeTtcblxuICAgIHJldHVybiBbeCwgeSwgMF07XG59XG5cbi8vIGNhbGN1bGF0ZSBhcmVhIGFuZCBsZW5ndGggb2YgdGhlIHBvbHlcbmZ1bmN0aW9uIGNhbGNTaXplKHBvaW50cykge1xuICAgIHZhciBhcmVhID0gMCxcbiAgICAgICAgZGlzdCA9IDA7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgYSwgYjsgaSA8IHBvaW50cy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgYSA9IGIgfHwgcG9pbnRzW2ldO1xuICAgICAgICBiID0gcG9pbnRzW2kgKyAxXTtcblxuICAgICAgICBhcmVhICs9IGFbMF0gKiBiWzFdIC0gYlswXSAqIGFbMV07XG5cbiAgICAgICAgLy8gdXNlIE1hbmhhdHRhbiBkaXN0YW5jZSBpbnN0ZWFkIG9mIEV1Y2xpZGlhbiBvbmUgdG8gYXZvaWQgZXhwZW5zaXZlIHNxdWFyZSByb290IGNvbXB1dGF0aW9uXG4gICAgICAgIGRpc3QgKz0gTWF0aC5hYnMoYlswXSAtIGFbMF0pICsgTWF0aC5hYnMoYlsxXSAtIGFbMV0pO1xuICAgIH1cbiAgICBwb2ludHMuYXJlYSA9IE1hdGguYWJzKGFyZWEgLyAyKTtcbiAgICBwb2ludHMuZGlzdCA9IGRpc3Q7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlRmVhdHVyZTtcblxuZnVuY3Rpb24gY3JlYXRlRmVhdHVyZSh0YWdzLCB0eXBlLCBnZW9tLCBpZCkge1xuICAgIHZhciBmZWF0dXJlID0ge1xuICAgICAgICBpZDogaWQgfHwgbnVsbCxcbiAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgZ2VvbWV0cnk6IGdlb20sXG4gICAgICAgIHRhZ3M6IHRhZ3MgfHwgbnVsbCxcbiAgICAgICAgbWluOiBbSW5maW5pdHksIEluZmluaXR5XSwgLy8gaW5pdGlhbCBiYm94IHZhbHVlc1xuICAgICAgICBtYXg6IFstSW5maW5pdHksIC1JbmZpbml0eV1cbiAgICB9O1xuICAgIGNhbGNCQm94KGZlYXR1cmUpO1xuICAgIHJldHVybiBmZWF0dXJlO1xufVxuXG4vLyBjYWxjdWxhdGUgdGhlIGZlYXR1cmUgYm91bmRpbmcgYm94IGZvciBmYXN0ZXIgY2xpcHBpbmcgbGF0ZXJcbmZ1bmN0aW9uIGNhbGNCQm94KGZlYXR1cmUpIHtcbiAgICB2YXIgZ2VvbWV0cnkgPSBmZWF0dXJlLmdlb21ldHJ5LFxuICAgICAgICBtaW4gPSBmZWF0dXJlLm1pbixcbiAgICAgICAgbWF4ID0gZmVhdHVyZS5tYXg7XG5cbiAgICBpZiAoZmVhdHVyZS50eXBlID09PSAxKSB7XG4gICAgICAgIGNhbGNSaW5nQkJveChtaW4sIG1heCwgZ2VvbWV0cnkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ2VvbWV0cnkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNhbGNSaW5nQkJveChtaW4sIG1heCwgZ2VvbWV0cnlbaV0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG59XG5cbmZ1bmN0aW9uIGNhbGNSaW5nQkJveChtaW4sIG1heCwgcG9pbnRzKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIHA7IGkgPCBwb2ludHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcCA9IHBvaW50c1tpXTtcbiAgICAgICAgbWluWzBdID0gTWF0aC5taW4ocFswXSwgbWluWzBdKTtcbiAgICAgICAgbWF4WzBdID0gTWF0aC5tYXgocFswXSwgbWF4WzBdKTtcbiAgICAgICAgbWluWzFdID0gTWF0aC5taW4ocFsxXSwgbWluWzFdKTtcbiAgICAgICAgbWF4WzFdID0gTWF0aC5tYXgocFsxXSwgbWF4WzFdKTtcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZ2VvanNvbnZ0O1xuXG52YXIgY29udmVydCA9IHJlcXVpcmUoJy4vY29udmVydCcpLCAgICAgLy8gR2VvSlNPTiBjb252ZXJzaW9uIGFuZCBwcmVwcm9jZXNzaW5nXG4gICAgdHJhbnNmb3JtID0gcmVxdWlyZSgnLi90cmFuc2Zvcm0nKSwgLy8gY29vcmRpbmF0ZSB0cmFuc2Zvcm1hdGlvblxuICAgIGNsaXAgPSByZXF1aXJlKCcuL2NsaXAnKSwgICAgICAgICAgIC8vIHN0cmlwZSBjbGlwcGluZyBhbGdvcml0aG1cbiAgICB3cmFwID0gcmVxdWlyZSgnLi93cmFwJyksICAgICAgICAgICAvLyBkYXRlIGxpbmUgcHJvY2Vzc2luZ1xuICAgIGNyZWF0ZVRpbGUgPSByZXF1aXJlKCcuL3RpbGUnKTsgICAgIC8vIGZpbmFsIHNpbXBsaWZpZWQgdGlsZSBnZW5lcmF0aW9uXG5cblxuZnVuY3Rpb24gZ2VvanNvbnZ0KGRhdGEsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gbmV3IEdlb0pTT05WVChkYXRhLCBvcHRpb25zKTtcbn1cblxuZnVuY3Rpb24gR2VvSlNPTlZUKGRhdGEsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gdGhpcy5vcHRpb25zID0gZXh0ZW5kKE9iamVjdC5jcmVhdGUodGhpcy5vcHRpb25zKSwgb3B0aW9ucyk7XG5cbiAgICB2YXIgZGVidWcgPSBvcHRpb25zLmRlYnVnO1xuXG4gICAgaWYgKGRlYnVnKSBjb25zb2xlLnRpbWUoJ3ByZXByb2Nlc3MgZGF0YScpO1xuXG4gICAgdmFyIHoyID0gMSA8PCBvcHRpb25zLm1heFpvb20sIC8vIDJeelxuICAgICAgICBmZWF0dXJlcyA9IGNvbnZlcnQoZGF0YSwgb3B0aW9ucy50b2xlcmFuY2UgLyAoejIgKiBvcHRpb25zLmV4dGVudCkpO1xuXG4gICAgdGhpcy50aWxlcyA9IHt9O1xuICAgIHRoaXMudGlsZUNvb3JkcyA9IFtdO1xuXG4gICAgaWYgKGRlYnVnKSB7XG4gICAgICAgIGNvbnNvbGUudGltZUVuZCgncHJlcHJvY2VzcyBkYXRhJyk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdpbmRleDogbWF4Wm9vbTogJWQsIG1heFBvaW50czogJWQnLCBvcHRpb25zLmluZGV4TWF4Wm9vbSwgb3B0aW9ucy5pbmRleE1heFBvaW50cyk7XG4gICAgICAgIGNvbnNvbGUudGltZSgnZ2VuZXJhdGUgdGlsZXMnKTtcbiAgICAgICAgdGhpcy5zdGF0cyA9IHt9O1xuICAgICAgICB0aGlzLnRvdGFsID0gMDtcbiAgICB9XG5cbiAgICBmZWF0dXJlcyA9IHdyYXAoZmVhdHVyZXMsIG9wdGlvbnMuYnVmZmVyIC8gb3B0aW9ucy5leHRlbnQsIGludGVyc2VjdFgpO1xuXG4gICAgLy8gc3RhcnQgc2xpY2luZyBmcm9tIHRoZSB0b3AgdGlsZSBkb3duXG4gICAgaWYgKGZlYXR1cmVzLmxlbmd0aCkgdGhpcy5zcGxpdFRpbGUoZmVhdHVyZXMsIDAsIDAsIDApO1xuXG4gICAgaWYgKGRlYnVnKSB7XG4gICAgICAgIGlmIChmZWF0dXJlcy5sZW5ndGgpIGNvbnNvbGUubG9nKCdmZWF0dXJlczogJWQsIHBvaW50czogJWQnLCB0aGlzLnRpbGVzWzBdLm51bUZlYXR1cmVzLCB0aGlzLnRpbGVzWzBdLm51bVBvaW50cyk7XG4gICAgICAgIGNvbnNvbGUudGltZUVuZCgnZ2VuZXJhdGUgdGlsZXMnKTtcbiAgICAgICAgY29uc29sZS5sb2coJ3RpbGVzIGdlbmVyYXRlZDonLCB0aGlzLnRvdGFsLCBKU09OLnN0cmluZ2lmeSh0aGlzLnN0YXRzKSk7XG4gICAgfVxufVxuXG5HZW9KU09OVlQucHJvdG90eXBlLm9wdGlvbnMgPSB7XG4gICAgbWF4Wm9vbTogMTQsICAgICAgICAgICAgLy8gbWF4IHpvb20gdG8gcHJlc2VydmUgZGV0YWlsIG9uXG4gICAgaW5kZXhNYXhab29tOiA1LCAgICAgICAgLy8gbWF4IHpvb20gaW4gdGhlIHRpbGUgaW5kZXhcbiAgICBpbmRleE1heFBvaW50czogMTAwMDAwLCAvLyBtYXggbnVtYmVyIG9mIHBvaW50cyBwZXIgdGlsZSBpbiB0aGUgdGlsZSBpbmRleFxuICAgIHNvbGlkQ2hpbGRyZW46IGZhbHNlLCAgIC8vIHdoZXRoZXIgdG8gdGlsZSBzb2xpZCBzcXVhcmUgdGlsZXMgZnVydGhlclxuICAgIHRvbGVyYW5jZTogMywgICAgICAgICAgIC8vIHNpbXBsaWZpY2F0aW9uIHRvbGVyYW5jZSAoaGlnaGVyIG1lYW5zIHNpbXBsZXIpXG4gICAgZXh0ZW50OiA0MDk2LCAgICAgICAgICAgLy8gdGlsZSBleHRlbnRcbiAgICBidWZmZXI6IDY0LCAgICAgICAgICAgICAvLyB0aWxlIGJ1ZmZlciBvbiBlYWNoIHNpZGVcbiAgICBkZWJ1ZzogMCAgICAgICAgICAgICAgICAvLyBsb2dnaW5nIGxldmVsICgwLCAxIG9yIDIpXG59O1xuXG5HZW9KU09OVlQucHJvdG90eXBlLnNwbGl0VGlsZSA9IGZ1bmN0aW9uIChmZWF0dXJlcywgeiwgeCwgeSwgY3osIGN4LCBjeSkge1xuXG4gICAgdmFyIHN0YWNrID0gW2ZlYXR1cmVzLCB6LCB4LCB5XSxcbiAgICAgICAgb3B0aW9ucyA9IHRoaXMub3B0aW9ucyxcbiAgICAgICAgZGVidWcgPSBvcHRpb25zLmRlYnVnLFxuICAgICAgICBzb2xpZCA9IG51bGw7XG5cbiAgICAvLyBhdm9pZCByZWN1cnNpb24gYnkgdXNpbmcgYSBwcm9jZXNzaW5nIHF1ZXVlXG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCkge1xuICAgICAgICB5ID0gc3RhY2sucG9wKCk7XG4gICAgICAgIHggPSBzdGFjay5wb3AoKTtcbiAgICAgICAgeiA9IHN0YWNrLnBvcCgpO1xuICAgICAgICBmZWF0dXJlcyA9IHN0YWNrLnBvcCgpO1xuXG4gICAgICAgIHZhciB6MiA9IDEgPDwgeixcbiAgICAgICAgICAgIGlkID0gdG9JRCh6LCB4LCB5KSxcbiAgICAgICAgICAgIHRpbGUgPSB0aGlzLnRpbGVzW2lkXSxcbiAgICAgICAgICAgIHRpbGVUb2xlcmFuY2UgPSB6ID09PSBvcHRpb25zLm1heFpvb20gPyAwIDogb3B0aW9ucy50b2xlcmFuY2UgLyAoejIgKiBvcHRpb25zLmV4dGVudCk7XG5cbiAgICAgICAgaWYgKCF0aWxlKSB7XG4gICAgICAgICAgICBpZiAoZGVidWcgPiAxKSBjb25zb2xlLnRpbWUoJ2NyZWF0aW9uJyk7XG5cbiAgICAgICAgICAgIHRpbGUgPSB0aGlzLnRpbGVzW2lkXSA9IGNyZWF0ZVRpbGUoZmVhdHVyZXMsIHoyLCB4LCB5LCB0aWxlVG9sZXJhbmNlLCB6ID09PSBvcHRpb25zLm1heFpvb20pO1xuICAgICAgICAgICAgdGhpcy50aWxlQ29vcmRzLnB1c2goe3o6IHosIHg6IHgsIHk6IHl9KTtcblxuICAgICAgICAgICAgaWYgKGRlYnVnKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRlYnVnID4gMSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndGlsZSB6JWQtJWQtJWQgKGZlYXR1cmVzOiAlZCwgcG9pbnRzOiAlZCwgc2ltcGxpZmllZDogJWQpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHosIHgsIHksIHRpbGUubnVtRmVhdHVyZXMsIHRpbGUubnVtUG9pbnRzLCB0aWxlLm51bVNpbXBsaWZpZWQpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLnRpbWVFbmQoJ2NyZWF0aW9uJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBrZXkgPSAneicgKyB6O1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdHNba2V5XSA9ICh0aGlzLnN0YXRzW2tleV0gfHwgMCkgKyAxO1xuICAgICAgICAgICAgICAgIHRoaXMudG90YWwrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHNhdmUgcmVmZXJlbmNlIHRvIG9yaWdpbmFsIGdlb21ldHJ5IGluIHRpbGUgc28gdGhhdCB3ZSBjYW4gZHJpbGwgZG93biBsYXRlciBpZiB3ZSBzdG9wIG5vd1xuICAgICAgICB0aWxlLnNvdXJjZSA9IGZlYXR1cmVzO1xuXG4gICAgICAgIC8vIGlmIGl0J3MgdGhlIGZpcnN0LXBhc3MgdGlsaW5nXG4gICAgICAgIGlmICghY3opIHtcbiAgICAgICAgICAgIC8vIHN0b3AgdGlsaW5nIGlmIHdlIHJlYWNoZWQgbWF4IHpvb20sIG9yIGlmIHRoZSB0aWxlIGlzIHRvbyBzaW1wbGVcbiAgICAgICAgICAgIGlmICh6ID09PSBvcHRpb25zLmluZGV4TWF4Wm9vbSB8fCB0aWxlLm51bVBvaW50cyA8PSBvcHRpb25zLmluZGV4TWF4UG9pbnRzKSBjb250aW51ZTtcblxuICAgICAgICAvLyBpZiBhIGRyaWxsZG93biB0byBhIHNwZWNpZmljIHRpbGVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHN0b3AgdGlsaW5nIGlmIHdlIHJlYWNoZWQgYmFzZSB6b29tIG9yIG91ciB0YXJnZXQgdGlsZSB6b29tXG4gICAgICAgICAgICBpZiAoeiA9PT0gb3B0aW9ucy5tYXhab29tIHx8IHogPT09IGN6KSBjb250aW51ZTtcblxuICAgICAgICAgICAgLy8gc3RvcCB0aWxpbmcgaWYgaXQncyBub3QgYW4gYW5jZXN0b3Igb2YgdGhlIHRhcmdldCB0aWxlXG4gICAgICAgICAgICB2YXIgbSA9IDEgPDwgKGN6IC0geik7XG4gICAgICAgICAgICBpZiAoeCAhPT0gTWF0aC5mbG9vcihjeCAvIG0pIHx8IHkgIT09IE1hdGguZmxvb3IoY3kgLyBtKSkgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzdG9wIHRpbGluZyBpZiB0aGUgdGlsZSBpcyBzb2xpZCBjbGlwcGVkIHNxdWFyZVxuICAgICAgICBpZiAoIW9wdGlvbnMuc29saWRDaGlsZHJlbiAmJiBpc0NsaXBwZWRTcXVhcmUodGlsZSwgb3B0aW9ucy5leHRlbnQsIG9wdGlvbnMuYnVmZmVyKSkge1xuICAgICAgICAgICAgaWYgKGN6KSBzb2xpZCA9IHo7IC8vIGFuZCByZW1lbWJlciB0aGUgem9vbSBpZiB3ZSdyZSBkcmlsbGluZyBkb3duXG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIHdlIHNsaWNlIGZ1cnRoZXIgZG93biwgbm8gbmVlZCB0byBrZWVwIHNvdXJjZSBnZW9tZXRyeVxuICAgICAgICB0aWxlLnNvdXJjZSA9IG51bGw7XG5cbiAgICAgICAgaWYgKGRlYnVnID4gMSkgY29uc29sZS50aW1lKCdjbGlwcGluZycpO1xuXG4gICAgICAgIC8vIHZhbHVlcyB3ZSdsbCB1c2UgZm9yIGNsaXBwaW5nXG4gICAgICAgIHZhciBrMSA9IDAuNSAqIG9wdGlvbnMuYnVmZmVyIC8gb3B0aW9ucy5leHRlbnQsXG4gICAgICAgICAgICBrMiA9IDAuNSAtIGsxLFxuICAgICAgICAgICAgazMgPSAwLjUgKyBrMSxcbiAgICAgICAgICAgIGs0ID0gMSArIGsxLFxuICAgICAgICAgICAgdGwsIGJsLCB0ciwgYnIsIGxlZnQsIHJpZ2h0O1xuXG4gICAgICAgIHRsID0gYmwgPSB0ciA9IGJyID0gbnVsbDtcblxuICAgICAgICBsZWZ0ICA9IGNsaXAoZmVhdHVyZXMsIHoyLCB4IC0gazEsIHggKyBrMywgMCwgaW50ZXJzZWN0WCwgdGlsZS5taW5bMF0sIHRpbGUubWF4WzBdKTtcbiAgICAgICAgcmlnaHQgPSBjbGlwKGZlYXR1cmVzLCB6MiwgeCArIGsyLCB4ICsgazQsIDAsIGludGVyc2VjdFgsIHRpbGUubWluWzBdLCB0aWxlLm1heFswXSk7XG5cbiAgICAgICAgaWYgKGxlZnQpIHtcbiAgICAgICAgICAgIHRsID0gY2xpcChsZWZ0LCB6MiwgeSAtIGsxLCB5ICsgazMsIDEsIGludGVyc2VjdFksIHRpbGUubWluWzFdLCB0aWxlLm1heFsxXSk7XG4gICAgICAgICAgICBibCA9IGNsaXAobGVmdCwgejIsIHkgKyBrMiwgeSArIGs0LCAxLCBpbnRlcnNlY3RZLCB0aWxlLm1pblsxXSwgdGlsZS5tYXhbMV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJpZ2h0KSB7XG4gICAgICAgICAgICB0ciA9IGNsaXAocmlnaHQsIHoyLCB5IC0gazEsIHkgKyBrMywgMSwgaW50ZXJzZWN0WSwgdGlsZS5taW5bMV0sIHRpbGUubWF4WzFdKTtcbiAgICAgICAgICAgIGJyID0gY2xpcChyaWdodCwgejIsIHkgKyBrMiwgeSArIGs0LCAxLCBpbnRlcnNlY3RZLCB0aWxlLm1pblsxXSwgdGlsZS5tYXhbMV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRlYnVnID4gMSkgY29uc29sZS50aW1lRW5kKCdjbGlwcGluZycpO1xuXG4gICAgICAgIGlmIChmZWF0dXJlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHN0YWNrLnB1c2godGwgfHwgW10sIHogKyAxLCB4ICogMiwgICAgIHkgKiAyKTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2goYmwgfHwgW10sIHogKyAxLCB4ICogMiwgICAgIHkgKiAyICsgMSk7XG4gICAgICAgICAgICBzdGFjay5wdXNoKHRyIHx8IFtdLCB6ICsgMSwgeCAqIDIgKyAxLCB5ICogMik7XG4gICAgICAgICAgICBzdGFjay5wdXNoKGJyIHx8IFtdLCB6ICsgMSwgeCAqIDIgKyAxLCB5ICogMiArIDEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHNvbGlkO1xufTtcblxuR2VvSlNPTlZULnByb3RvdHlwZS5nZXRUaWxlID0gZnVuY3Rpb24gKHosIHgsIHkpIHtcbiAgICB2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9ucyxcbiAgICAgICAgZXh0ZW50ID0gb3B0aW9ucy5leHRlbnQsXG4gICAgICAgIGRlYnVnID0gb3B0aW9ucy5kZWJ1ZztcblxuICAgIHZhciB6MiA9IDEgPDwgejtcbiAgICB4ID0gKCh4ICUgejIpICsgejIpICUgejI7IC8vIHdyYXAgdGlsZSB4IGNvb3JkaW5hdGVcblxuICAgIHZhciBpZCA9IHRvSUQoeiwgeCwgeSk7XG4gICAgaWYgKHRoaXMudGlsZXNbaWRdKSByZXR1cm4gdHJhbnNmb3JtLnRpbGUodGhpcy50aWxlc1tpZF0sIGV4dGVudCk7XG5cbiAgICBpZiAoZGVidWcgPiAxKSBjb25zb2xlLmxvZygnZHJpbGxpbmcgZG93biB0byB6JWQtJWQtJWQnLCB6LCB4LCB5KTtcblxuICAgIHZhciB6MCA9IHosXG4gICAgICAgIHgwID0geCxcbiAgICAgICAgeTAgPSB5LFxuICAgICAgICBwYXJlbnQ7XG5cbiAgICB3aGlsZSAoIXBhcmVudCAmJiB6MCA+IDApIHtcbiAgICAgICAgejAtLTtcbiAgICAgICAgeDAgPSBNYXRoLmZsb29yKHgwIC8gMik7XG4gICAgICAgIHkwID0gTWF0aC5mbG9vcih5MCAvIDIpO1xuICAgICAgICBwYXJlbnQgPSB0aGlzLnRpbGVzW3RvSUQoejAsIHgwLCB5MCldO1xuICAgIH1cblxuICAgIGlmICghcGFyZW50IHx8ICFwYXJlbnQuc291cmNlKSByZXR1cm4gbnVsbDtcblxuICAgIC8vIGlmIHdlIGZvdW5kIGEgcGFyZW50IHRpbGUgY29udGFpbmluZyB0aGUgb3JpZ2luYWwgZ2VvbWV0cnksIHdlIGNhbiBkcmlsbCBkb3duIGZyb20gaXRcbiAgICBpZiAoZGVidWcgPiAxKSBjb25zb2xlLmxvZygnZm91bmQgcGFyZW50IHRpbGUgeiVkLSVkLSVkJywgejAsIHgwLCB5MCk7XG5cbiAgICAvLyBpdCBwYXJlbnQgdGlsZSBpcyBhIHNvbGlkIGNsaXBwZWQgc3F1YXJlLCByZXR1cm4gaXQgaW5zdGVhZCBzaW5jZSBpdCdzIGlkZW50aWNhbFxuICAgIGlmIChpc0NsaXBwZWRTcXVhcmUocGFyZW50LCBleHRlbnQsIG9wdGlvbnMuYnVmZmVyKSkgcmV0dXJuIHRyYW5zZm9ybS50aWxlKHBhcmVudCwgZXh0ZW50KTtcblxuICAgIGlmIChkZWJ1ZyA+IDEpIGNvbnNvbGUudGltZSgnZHJpbGxpbmcgZG93bicpO1xuICAgIHZhciBzb2xpZCA9IHRoaXMuc3BsaXRUaWxlKHBhcmVudC5zb3VyY2UsIHowLCB4MCwgeTAsIHosIHgsIHkpO1xuICAgIGlmIChkZWJ1ZyA+IDEpIGNvbnNvbGUudGltZUVuZCgnZHJpbGxpbmcgZG93bicpO1xuXG4gICAgLy8gb25lIG9mIHRoZSBwYXJlbnQgdGlsZXMgd2FzIGEgc29saWQgY2xpcHBlZCBzcXVhcmVcbiAgICBpZiAoc29saWQgIT09IG51bGwpIHtcbiAgICAgICAgdmFyIG0gPSAxIDw8ICh6IC0gc29saWQpO1xuICAgICAgICBpZCA9IHRvSUQoc29saWQsIE1hdGguZmxvb3IoeCAvIG0pLCBNYXRoLmZsb29yKHkgLyBtKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMudGlsZXNbaWRdID8gdHJhbnNmb3JtLnRpbGUodGhpcy50aWxlc1tpZF0sIGV4dGVudCkgOiBudWxsO1xufTtcblxuZnVuY3Rpb24gdG9JRCh6LCB4LCB5KSB7XG4gICAgcmV0dXJuICgoKDEgPDwgeikgKiB5ICsgeCkgKiAzMikgKyB6O1xufVxuXG5mdW5jdGlvbiBpbnRlcnNlY3RYKGEsIGIsIHgpIHtcbiAgICByZXR1cm4gW3gsICh4IC0gYVswXSkgKiAoYlsxXSAtIGFbMV0pIC8gKGJbMF0gLSBhWzBdKSArIGFbMV0sIDFdO1xufVxuZnVuY3Rpb24gaW50ZXJzZWN0WShhLCBiLCB5KSB7XG4gICAgcmV0dXJuIFsoeSAtIGFbMV0pICogKGJbMF0gLSBhWzBdKSAvIChiWzFdIC0gYVsxXSkgKyBhWzBdLCB5LCAxXTtcbn1cblxuZnVuY3Rpb24gZXh0ZW5kKGRlc3QsIHNyYykge1xuICAgIGZvciAodmFyIGkgaW4gc3JjKSBkZXN0W2ldID0gc3JjW2ldO1xuICAgIHJldHVybiBkZXN0O1xufVxuXG4vLyBjaGVja3Mgd2hldGhlciBhIHRpbGUgaXMgYSB3aG9sZS1hcmVhIGZpbGwgYWZ0ZXIgY2xpcHBpbmc7IGlmIGl0IGlzLCB0aGVyZSdzIG5vIHNlbnNlIHNsaWNpbmcgaXQgZnVydGhlclxuZnVuY3Rpb24gaXNDbGlwcGVkU3F1YXJlKHRpbGUsIGV4dGVudCwgYnVmZmVyKSB7XG5cbiAgICB2YXIgZmVhdHVyZXMgPSB0aWxlLnNvdXJjZTtcbiAgICBpZiAoZmVhdHVyZXMubGVuZ3RoICE9PSAxKSByZXR1cm4gZmFsc2U7XG5cbiAgICB2YXIgZmVhdHVyZSA9IGZlYXR1cmVzWzBdO1xuICAgIGlmIChmZWF0dXJlLnR5cGUgIT09IDMgfHwgZmVhdHVyZS5nZW9tZXRyeS5sZW5ndGggPiAxKSByZXR1cm4gZmFsc2U7XG5cbiAgICB2YXIgbGVuID0gZmVhdHVyZS5nZW9tZXRyeVswXS5sZW5ndGg7XG4gICAgaWYgKGxlbiAhPT0gNSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB2YXIgcCA9IHRyYW5zZm9ybS5wb2ludChmZWF0dXJlLmdlb21ldHJ5WzBdW2ldLCBleHRlbnQsIHRpbGUuejIsIHRpbGUueCwgdGlsZS55KTtcbiAgICAgICAgaWYgKChwWzBdICE9PSAtYnVmZmVyICYmIHBbMF0gIT09IGV4dGVudCArIGJ1ZmZlcikgfHxcbiAgICAgICAgICAgIChwWzFdICE9PSAtYnVmZmVyICYmIHBbMV0gIT09IGV4dGVudCArIGJ1ZmZlcikpIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBzaW1wbGlmeTtcblxuLy8gY2FsY3VsYXRlIHNpbXBsaWZpY2F0aW9uIGRhdGEgdXNpbmcgb3B0aW1pemVkIERvdWdsYXMtUGV1Y2tlciBhbGdvcml0aG1cblxuZnVuY3Rpb24gc2ltcGxpZnkocG9pbnRzLCB0b2xlcmFuY2UpIHtcblxuICAgIHZhciBzcVRvbGVyYW5jZSA9IHRvbGVyYW5jZSAqIHRvbGVyYW5jZSxcbiAgICAgICAgbGVuID0gcG9pbnRzLmxlbmd0aCxcbiAgICAgICAgZmlyc3QgPSAwLFxuICAgICAgICBsYXN0ID0gbGVuIC0gMSxcbiAgICAgICAgc3RhY2sgPSBbXSxcbiAgICAgICAgaSwgbWF4U3FEaXN0LCBzcURpc3QsIGluZGV4O1xuXG4gICAgLy8gYWx3YXlzIHJldGFpbiB0aGUgZW5kcG9pbnRzICgxIGlzIHRoZSBtYXggdmFsdWUpXG4gICAgcG9pbnRzW2ZpcnN0XVsyXSA9IDE7XG4gICAgcG9pbnRzW2xhc3RdWzJdID0gMTtcblxuICAgIC8vIGF2b2lkIHJlY3Vyc2lvbiBieSB1c2luZyBhIHN0YWNrXG4gICAgd2hpbGUgKGxhc3QpIHtcblxuICAgICAgICBtYXhTcURpc3QgPSAwO1xuXG4gICAgICAgIGZvciAoaSA9IGZpcnN0ICsgMTsgaSA8IGxhc3Q7IGkrKykge1xuICAgICAgICAgICAgc3FEaXN0ID0gZ2V0U3FTZWdEaXN0KHBvaW50c1tpXSwgcG9pbnRzW2ZpcnN0XSwgcG9pbnRzW2xhc3RdKTtcblxuICAgICAgICAgICAgaWYgKHNxRGlzdCA+IG1heFNxRGlzdCkge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICBtYXhTcURpc3QgPSBzcURpc3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF4U3FEaXN0ID4gc3FUb2xlcmFuY2UpIHtcbiAgICAgICAgICAgIHBvaW50c1tpbmRleF1bMl0gPSBtYXhTcURpc3Q7IC8vIHNhdmUgdGhlIHBvaW50IGltcG9ydGFuY2UgaW4gc3F1YXJlZCBwaXhlbHMgYXMgYSB6IGNvb3JkaW5hdGVcbiAgICAgICAgICAgIHN0YWNrLnB1c2goZmlyc3QpO1xuICAgICAgICAgICAgc3RhY2sucHVzaChpbmRleCk7XG4gICAgICAgICAgICBmaXJzdCA9IGluZGV4O1xuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsYXN0ID0gc3RhY2sucG9wKCk7XG4gICAgICAgICAgICBmaXJzdCA9IHN0YWNrLnBvcCgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyBzcXVhcmUgZGlzdGFuY2UgZnJvbSBhIHBvaW50IHRvIGEgc2VnbWVudFxuZnVuY3Rpb24gZ2V0U3FTZWdEaXN0KHAsIGEsIGIpIHtcblxuICAgIHZhciB4ID0gYVswXSwgeSA9IGFbMV0sXG4gICAgICAgIGJ4ID0gYlswXSwgYnkgPSBiWzFdLFxuICAgICAgICBweCA9IHBbMF0sIHB5ID0gcFsxXSxcbiAgICAgICAgZHggPSBieCAtIHgsXG4gICAgICAgIGR5ID0gYnkgLSB5O1xuXG4gICAgaWYgKGR4ICE9PSAwIHx8IGR5ICE9PSAwKSB7XG5cbiAgICAgICAgdmFyIHQgPSAoKHB4IC0geCkgKiBkeCArIChweSAtIHkpICogZHkpIC8gKGR4ICogZHggKyBkeSAqIGR5KTtcblxuICAgICAgICBpZiAodCA+IDEpIHtcbiAgICAgICAgICAgIHggPSBieDtcbiAgICAgICAgICAgIHkgPSBieTtcblxuICAgICAgICB9IGVsc2UgaWYgKHQgPiAwKSB7XG4gICAgICAgICAgICB4ICs9IGR4ICogdDtcbiAgICAgICAgICAgIHkgKz0gZHkgKiB0O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZHggPSBweCAtIHg7XG4gICAgZHkgPSBweSAtIHk7XG5cbiAgICByZXR1cm4gZHggKiBkeCArIGR5ICogZHk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlVGlsZTtcblxuZnVuY3Rpb24gY3JlYXRlVGlsZShmZWF0dXJlcywgejIsIHR4LCB0eSwgdG9sZXJhbmNlLCBub1NpbXBsaWZ5KSB7XG4gICAgdmFyIHRpbGUgPSB7XG4gICAgICAgIGZlYXR1cmVzOiBbXSxcbiAgICAgICAgbnVtUG9pbnRzOiAwLFxuICAgICAgICBudW1TaW1wbGlmaWVkOiAwLFxuICAgICAgICBudW1GZWF0dXJlczogMCxcbiAgICAgICAgc291cmNlOiBudWxsLFxuICAgICAgICB4OiB0eCxcbiAgICAgICAgeTogdHksXG4gICAgICAgIHoyOiB6MixcbiAgICAgICAgdHJhbnNmb3JtZWQ6IGZhbHNlLFxuICAgICAgICBtaW46IFsyLCAxXSxcbiAgICAgICAgbWF4OiBbLTEsIDBdXG4gICAgfTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZlYXR1cmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRpbGUubnVtRmVhdHVyZXMrKztcbiAgICAgICAgYWRkRmVhdHVyZSh0aWxlLCBmZWF0dXJlc1tpXSwgdG9sZXJhbmNlLCBub1NpbXBsaWZ5KTtcblxuICAgICAgICB2YXIgbWluID0gZmVhdHVyZXNbaV0ubWluLFxuICAgICAgICAgICAgbWF4ID0gZmVhdHVyZXNbaV0ubWF4O1xuXG4gICAgICAgIGlmIChtaW5bMF0gPCB0aWxlLm1pblswXSkgdGlsZS5taW5bMF0gPSBtaW5bMF07XG4gICAgICAgIGlmIChtaW5bMV0gPCB0aWxlLm1pblsxXSkgdGlsZS5taW5bMV0gPSBtaW5bMV07XG4gICAgICAgIGlmIChtYXhbMF0gPiB0aWxlLm1heFswXSkgdGlsZS5tYXhbMF0gPSBtYXhbMF07XG4gICAgICAgIGlmIChtYXhbMV0gPiB0aWxlLm1heFsxXSkgdGlsZS5tYXhbMV0gPSBtYXhbMV07XG4gICAgfVxuICAgIHJldHVybiB0aWxlO1xufVxuXG5mdW5jdGlvbiBhZGRGZWF0dXJlKHRpbGUsIGZlYXR1cmUsIHRvbGVyYW5jZSwgbm9TaW1wbGlmeSkge1xuXG4gICAgdmFyIGdlb20gPSBmZWF0dXJlLmdlb21ldHJ5LFxuICAgICAgICB0eXBlID0gZmVhdHVyZS50eXBlLFxuICAgICAgICBzaW1wbGlmaWVkID0gW10sXG4gICAgICAgIHNxVG9sZXJhbmNlID0gdG9sZXJhbmNlICogdG9sZXJhbmNlLFxuICAgICAgICBpLCBqLCByaW5nLCBwO1xuXG4gICAgaWYgKHR5cGUgPT09IDEpIHtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGdlb20ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHNpbXBsaWZpZWQucHVzaChnZW9tW2ldKTtcbiAgICAgICAgICAgIHRpbGUubnVtUG9pbnRzKys7XG4gICAgICAgICAgICB0aWxlLm51bVNpbXBsaWZpZWQrKztcbiAgICAgICAgfVxuXG4gICAgfSBlbHNlIHtcblxuICAgICAgICAvLyBzaW1wbGlmeSBhbmQgdHJhbnNmb3JtIHByb2plY3RlZCBjb29yZGluYXRlcyBmb3IgdGlsZSBnZW9tZXRyeVxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZ2VvbS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgcmluZyA9IGdlb21baV07XG5cbiAgICAgICAgICAgIC8vIGZpbHRlciBvdXQgdGlueSBwb2x5bGluZXMgJiBwb2x5Z29uc1xuICAgICAgICAgICAgaWYgKCFub1NpbXBsaWZ5ICYmICgodHlwZSA9PT0gMiAmJiByaW5nLmRpc3QgPCB0b2xlcmFuY2UpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh0eXBlID09PSAzICYmIHJpbmcuYXJlYSA8IHNxVG9sZXJhbmNlKSkpIHtcbiAgICAgICAgICAgICAgICB0aWxlLm51bVBvaW50cyArPSByaW5nLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHNpbXBsaWZpZWRSaW5nID0gW107XG5cbiAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCByaW5nLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgcCA9IHJpbmdbal07XG4gICAgICAgICAgICAgICAgLy8ga2VlcCBwb2ludHMgd2l0aCBpbXBvcnRhbmNlID4gdG9sZXJhbmNlXG4gICAgICAgICAgICAgICAgaWYgKG5vU2ltcGxpZnkgfHwgcFsyXSA+IHNxVG9sZXJhbmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHNpbXBsaWZpZWRSaW5nLnB1c2gocCk7XG4gICAgICAgICAgICAgICAgICAgIHRpbGUubnVtU2ltcGxpZmllZCsrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aWxlLm51bVBvaW50cysrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodHlwZSA9PT0gMykgcmV3aW5kKHNpbXBsaWZpZWRSaW5nLCByaW5nLm91dGVyKTtcblxuICAgICAgICAgICAgc2ltcGxpZmllZC5wdXNoKHNpbXBsaWZpZWRSaW5nKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzaW1wbGlmaWVkLmxlbmd0aCkge1xuICAgICAgICB2YXIgdGlsZUZlYXR1cmUgPSB7XG4gICAgICAgICAgICBnZW9tZXRyeTogc2ltcGxpZmllZCxcbiAgICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgICB0YWdzOiBmZWF0dXJlLnRhZ3MgfHwgbnVsbFxuICAgICAgICB9O1xuICAgICAgICBpZiAoZmVhdHVyZS5pZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdGlsZUZlYXR1cmUuaWQgPSBmZWF0dXJlLmlkO1xuICAgICAgICB9XG4gICAgICAgIHRpbGUuZmVhdHVyZXMucHVzaCh0aWxlRmVhdHVyZSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZXdpbmQocmluZywgY2xvY2t3aXNlKSB7XG4gICAgdmFyIGFyZWEgPSBzaWduZWRBcmVhKHJpbmcpO1xuICAgIGlmIChhcmVhIDwgMCA9PT0gY2xvY2t3aXNlKSByaW5nLnJldmVyc2UoKTtcbn1cblxuZnVuY3Rpb24gc2lnbmVkQXJlYShyaW5nKSB7XG4gICAgdmFyIHN1bSA9IDA7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHJpbmcubGVuZ3RoLCBqID0gbGVuIC0gMSwgcDEsIHAyOyBpIDwgbGVuOyBqID0gaSsrKSB7XG4gICAgICAgIHAxID0gcmluZ1tpXTtcbiAgICAgICAgcDIgPSByaW5nW2pdO1xuICAgICAgICBzdW0gKz0gKHAyWzBdIC0gcDFbMF0pICogKHAxWzFdICsgcDJbMV0pO1xuICAgIH1cbiAgICByZXR1cm4gc3VtO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLnRpbGUgPSB0cmFuc2Zvcm1UaWxlO1xuZXhwb3J0cy5wb2ludCA9IHRyYW5zZm9ybVBvaW50O1xuXG4vLyBUcmFuc2Zvcm1zIHRoZSBjb29yZGluYXRlcyBvZiBlYWNoIGZlYXR1cmUgaW4gdGhlIGdpdmVuIHRpbGUgZnJvbVxuLy8gbWVyY2F0b3ItcHJvamVjdGVkIHNwYWNlIGludG8gKGV4dGVudCB4IGV4dGVudCkgdGlsZSBzcGFjZS5cbmZ1bmN0aW9uIHRyYW5zZm9ybVRpbGUodGlsZSwgZXh0ZW50KSB7XG4gICAgaWYgKHRpbGUudHJhbnNmb3JtZWQpIHJldHVybiB0aWxlO1xuXG4gICAgdmFyIHoyID0gdGlsZS56MixcbiAgICAgICAgdHggPSB0aWxlLngsXG4gICAgICAgIHR5ID0gdGlsZS55LFxuICAgICAgICBpLCBqLCBrO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IHRpbGUuZmVhdHVyZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGZlYXR1cmUgPSB0aWxlLmZlYXR1cmVzW2ldLFxuICAgICAgICAgICAgZ2VvbSA9IGZlYXR1cmUuZ2VvbWV0cnksXG4gICAgICAgICAgICB0eXBlID0gZmVhdHVyZS50eXBlO1xuXG4gICAgICAgIGlmICh0eXBlID09PSAxKSB7XG4gICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgZ2VvbS5sZW5ndGg7IGorKykgZ2VvbVtqXSA9IHRyYW5zZm9ybVBvaW50KGdlb21bal0sIGV4dGVudCwgejIsIHR4LCB0eSk7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBnZW9tLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJpbmcgPSBnZW9tW2pdO1xuICAgICAgICAgICAgICAgIGZvciAoayA9IDA7IGsgPCByaW5nLmxlbmd0aDsgaysrKSByaW5nW2tdID0gdHJhbnNmb3JtUG9pbnQocmluZ1trXSwgZXh0ZW50LCB6MiwgdHgsIHR5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRpbGUudHJhbnNmb3JtZWQgPSB0cnVlO1xuXG4gICAgcmV0dXJuIHRpbGU7XG59XG5cbmZ1bmN0aW9uIHRyYW5zZm9ybVBvaW50KHAsIGV4dGVudCwgejIsIHR4LCB0eSkge1xuICAgIHZhciB4ID0gTWF0aC5yb3VuZChleHRlbnQgKiAocFswXSAqIHoyIC0gdHgpKSxcbiAgICAgICAgeSA9IE1hdGgucm91bmQoZXh0ZW50ICogKHBbMV0gKiB6MiAtIHR5KSk7XG4gICAgcmV0dXJuIFt4LCB5XTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNsaXAgPSByZXF1aXJlKCcuL2NsaXAnKTtcbnZhciBjcmVhdGVGZWF0dXJlID0gcmVxdWlyZSgnLi9mZWF0dXJlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gd3JhcDtcblxuZnVuY3Rpb24gd3JhcChmZWF0dXJlcywgYnVmZmVyLCBpbnRlcnNlY3RYKSB7XG4gICAgdmFyIG1lcmdlZCA9IGZlYXR1cmVzLFxuICAgICAgICBsZWZ0ICA9IGNsaXAoZmVhdHVyZXMsIDEsIC0xIC0gYnVmZmVyLCBidWZmZXIsICAgICAwLCBpbnRlcnNlY3RYLCAtMSwgMiksIC8vIGxlZnQgd29ybGQgY29weVxuICAgICAgICByaWdodCA9IGNsaXAoZmVhdHVyZXMsIDEsICAxIC0gYnVmZmVyLCAyICsgYnVmZmVyLCAwLCBpbnRlcnNlY3RYLCAtMSwgMik7IC8vIHJpZ2h0IHdvcmxkIGNvcHlcblxuICAgIGlmIChsZWZ0IHx8IHJpZ2h0KSB7XG4gICAgICAgIG1lcmdlZCA9IGNsaXAoZmVhdHVyZXMsIDEsIC1idWZmZXIsIDEgKyBidWZmZXIsIDAsIGludGVyc2VjdFgsIC0xLCAyKSB8fCBbXTsgLy8gY2VudGVyIHdvcmxkIGNvcHlcblxuICAgICAgICBpZiAobGVmdCkgbWVyZ2VkID0gc2hpZnRGZWF0dXJlQ29vcmRzKGxlZnQsIDEpLmNvbmNhdChtZXJnZWQpOyAvLyBtZXJnZSBsZWZ0IGludG8gY2VudGVyXG4gICAgICAgIGlmIChyaWdodCkgbWVyZ2VkID0gbWVyZ2VkLmNvbmNhdChzaGlmdEZlYXR1cmVDb29yZHMocmlnaHQsIC0xKSk7IC8vIG1lcmdlIHJpZ2h0IGludG8gY2VudGVyXG4gICAgfVxuXG4gICAgcmV0dXJuIG1lcmdlZDtcbn1cblxuZnVuY3Rpb24gc2hpZnRGZWF0dXJlQ29vcmRzKGZlYXR1cmVzLCBvZmZzZXQpIHtcbiAgICB2YXIgbmV3RmVhdHVyZXMgPSBbXTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmVhdHVyZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGZlYXR1cmUgPSBmZWF0dXJlc1tpXSxcbiAgICAgICAgICAgIHR5cGUgPSBmZWF0dXJlLnR5cGU7XG5cbiAgICAgICAgdmFyIG5ld0dlb21ldHJ5O1xuXG4gICAgICAgIGlmICh0eXBlID09PSAxKSB7XG4gICAgICAgICAgICBuZXdHZW9tZXRyeSA9IHNoaWZ0Q29vcmRzKGZlYXR1cmUuZ2VvbWV0cnksIG9mZnNldCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuZXdHZW9tZXRyeSA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBmZWF0dXJlLmdlb21ldHJ5Lmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgbmV3R2VvbWV0cnkucHVzaChzaGlmdENvb3JkcyhmZWF0dXJlLmdlb21ldHJ5W2pdLCBvZmZzZXQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIG5ld0ZlYXR1cmVzLnB1c2goY3JlYXRlRmVhdHVyZShmZWF0dXJlLnRhZ3MsIHR5cGUsIG5ld0dlb21ldHJ5LCBmZWF0dXJlLmlkKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ld0ZlYXR1cmVzO1xufVxuXG5mdW5jdGlvbiBzaGlmdENvb3Jkcyhwb2ludHMsIG9mZnNldCkge1xuICAgIHZhciBuZXdQb2ludHMgPSBbXTtcbiAgICBuZXdQb2ludHMuYXJlYSA9IHBvaW50cy5hcmVhO1xuICAgIG5ld1BvaW50cy5kaXN0ID0gcG9pbnRzLmRpc3Q7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBuZXdQb2ludHMucHVzaChbcG9pbnRzW2ldWzBdICsgb2Zmc2V0LCBwb2ludHNbaV1bMV0sIHBvaW50c1tpXVsyXV0pO1xuICAgIH1cbiAgICByZXR1cm4gbmV3UG9pbnRzO1xufVxuIl19
