var gaussRandom = require('gauss-random')
var snapPoints = require('../snap-dfs')

var NUM_POINTS = (process.argv[2])|0

console.log('building qt for', NUM_POINTS, 'points')

var points  = new Float32Array(2*NUM_POINTS)
var levelQT = new Float32Array(2*NUM_POINTS)
var ids     = new Int32Array(NUM_POINTS)

for(var i=0; i<2*NUM_POINTS; ++i) {
  points[i] = i * Math.pow(2,-1024)
}

var timeStart = Date.now()
var levels = snapPoints(points, levelQT, ids)
console.log(Date.now() - timeStart)

console.log(levels)
