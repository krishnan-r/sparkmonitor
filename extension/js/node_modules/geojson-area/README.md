[![Build Status](https://travis-ci.org/mapbox/geojson-area.png)](https://travis-ci.org/mapbox/geojson-area)

# geojson-area

Calculate the area inside of a [GeoJSON](http://geojson.org/) Polygon.

## usage

    npm install geojson-area

## example

```js
var geojsonArea = require('geojson-area');

var area = geojsonArea.geometry(obj);
```

## api

### `geojsonArea.geometry(obj)`

Given a Geometry object of type Polygon or MultiPolygon, return contained
area as square meters. Invalid input will return `null`.

Adapted from [OpenLayers](http://openlayers.org/)
