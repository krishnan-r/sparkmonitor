'use strict'

var tape = require('tape')
var snap = require('../snap')
var approxEqual = require('almost-equal')

tape('snap-points-2d', function(t) {

  function verifySnap(points) {
    var numPoints = points.length>>>1
    var npoints   = points.slice()
    var ids       = new Array(numPoints)
    var weights   = new Array(numPoints)
    var bounds    = [0,0,0,0]

    var scales = snap(npoints, ids, weights, bounds)

    var sx = bounds[0]
    var sy = bounds[1]
    var sw = bounds[2] - bounds[0]
    var sh = bounds[3] - bounds[1]

    for(var i=0; i<numPoints; ++i) {
      var id = ids[i]
      t.ok(approxEqual(sx + sw*npoints[2*i],   points[2*id], approxEqual.FLT_EPSILON),
        'id perm ok: ' + id + ' ' +  points[2*id] + ' = ' + (sx + sw*npoints[2*i]))
      t.ok(approxEqual(sy + sh*npoints[2*i+1], points[2*id+1], approxEqual.FLT_EPSILON), 'id perm ok: ' + id + ' ' +  points[2*id+1] + ' = ' + (sy + sh*npoints[2*i+1]))
    }

    t.equals(scales[scales.length-1].offset, 0, 'last item')
    t.equals(scales[0].offset+scales[0].count, numPoints, 'first item')

    for(var i=0; i<scales.length; ++i) {
      var s = scales[i]

      var r = s.pixelSize
      var offs  = s.offset
      var count = s.count

      console.log('level=', i, r, offs, count)

      if(i > 0) {
        t.equals(offs+count, scales[i-1].offset, 'offset for ' + i)
        t.ok(r < scales[i-1].pixelSize, 'test scales ok')
      }

k_loop:
      for(var k=offs-1; k>=0; --k) {
        var ax = npoints[2*k]
        var ay = npoints[2*k+1]

        var mind = Infinity

        for(var j=offs; j<offs+count; ++j) {
          var x = npoints[2*j]
          var y = npoints[2*j+1]

          mind = Math.min(mind, Math.max(Math.abs(ax-x), Math.abs(ay-y)))
        }

        t.ok(mind <= 2.0 * r, k + ':' + ax + ',' + ay + ' is not covered - closest pt = ' + mind)
      }
    }
  }

  t.same(snap([], [], []), [])

  verifySnap([
     1, 1,
     2, 2,
     3, 3,
     4, 4,
     5, 5])

  verifySnap([
    0,0,
    0,0,
    0,0,
    0,0])

  verifySnap([
    1, 2,
    2, 5,
    3, 6,
    4, -1
  ])

  var pts = new Array(100)
  for(var i=0; i<100; ++i) {
    pts[i] = Math.random()
  }
  verifySnap(pts)

  t.end()
})
