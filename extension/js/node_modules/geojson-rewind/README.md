[![Build Status](https://travis-ci.org/mapbox/geojson-rewind.png)](https://travis-ci.org/mapbox/geojson-rewind)

# geojson-rewind

The [GeoJSON](http://geojson.org/) specification is not picky about winding order, but
this is.

This lets you use [Canvas](http://www.bit-101.com/blog/?p=3702) and other drawing
libraries's default behavior to color the interior rings of Polygon and MultiPolygon
features.

## usage

as npm module:

    npm install --save geojson-rewind

as console utility

    # install
    npm install -g geojson-rewind
    # use
    geojson-rewind foo.geojson

as browser library

copy `geojson-rewind.js`

## api

`rewind(geojson, counterclockwise)`

Given a GeoJSON FeatureCollection, Feature, or Geometry, return a version
with inner and outer rings of different winding orders.

If `counterclockwise` is `true`, the outer ring is counterclockwise, otherwise
it is clockwise.
