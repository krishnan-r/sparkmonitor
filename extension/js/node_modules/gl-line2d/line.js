'use strict'

module.exports = createLinePlot

var createShader = require('gl-shader')
var createBuffer = require('gl-buffer')
var createTexture = require('gl-texture2d')
var ndarray = require('ndarray')
var pool = require('typedarray-pool')

var SHADERS = require('./lib/shaders')

function GLLine2D(
  plot,
  dashPattern,
  lineBufferHi,
  lineBufferLo,
  pickBuffer,
  lineShader,
  mitreShader,
  fillShader,
  pickShader) {

  this.plot         = plot
  this.dashPattern  = dashPattern
  this.lineBufferHi = lineBufferHi
  this.lineBufferLo = lineBufferLo
  this.pickBuffer   = pickBuffer
  this.lineShader   = lineShader
  this.mitreShader  = mitreShader
  this.fillShader   = fillShader
  this.pickShader   = pickShader
  this.usingDashes  = false

  this.bounds     = [Infinity, Infinity, -Infinity, -Infinity]
  this.width      = 1
  this.color      = [0, 0, 1, 1]

  //Fill to axes
  this.fill       = [false, false, false, false]
  this.fillColor  = [
    [0, 0, 0, 1],
    [0, 0, 0, 1],
    [0, 0, 0, 1],
    [0, 0, 0, 1]
  ]

  this.data       = null
  this.numPoints  = 0
  this.vertCount  = 0

  this.pickOffset = 0
}

var proto = GLLine2D.prototype

proto.setProjectionModel = (function() {

  var pm = {
    scaleHi: new Float32Array([0, 0]),
    scaleLo: new Float32Array([0, 0]),
    translateHi: new Float32Array([0, 0]),
    translateLo: new Float32Array([0, 0]),
    screenShape: [0, 0]
  }

  return function() {

    var bounds  = this.bounds
    var viewBox = this.plot.viewBox
    var dataBox = this.plot.dataBox

    var boundX  = bounds[2] - bounds[0]
    var boundY  = bounds[3] - bounds[1]
    var dataX   = dataBox[2] - dataBox[0]
    var dataY   = dataBox[3] - dataBox[1]
    var screenX = viewBox[2] - viewBox[0]
    var screenY = viewBox[3] - viewBox[1]

    var scaleX = 2 * boundX / dataX
    var scaleY = 2 * boundY / dataY
    var translateX = (bounds[0] - dataBox[0] - 0.5 * dataX) / boundX
    var translateY = (bounds[1] - dataBox[1] - 0.5 * dataY) / boundY

    pm.scaleHi[0]     = scaleX
    pm.scaleHi[1]     = scaleY
    pm.scaleLo[0]     = scaleX - pm.scaleHi[0]
    pm.scaleLo[1]     = scaleY - pm.scaleHi[1]
    pm.translateHi[0] = translateX
    pm.translateHi[1] = translateY
    pm.translateLo[0] = translateX - pm.translateHi[0]
    pm.translateLo[1] = translateY - pm.translateHi[1]

    pm.screenShape[0] = screenX
    pm.screenShape[1] = screenY

    return pm
  }
})()

proto.setProjectionUniforms = function(uniforms, projectionModel) {
  uniforms.scaleHi = projectionModel.scaleHi
  uniforms.scaleLo = projectionModel.scaleLo
  uniforms.translateHi = projectionModel.translateHi
  uniforms.translateLo = projectionModel.translateLo
  uniforms.screenShape = projectionModel.screenShape
}

proto.draw = (function() {

  var PX_AXIS = [1, 0]
  var NX_AXIS = [-1, 0]
  var PY_AXIS = [0, 1]
  var NY_AXIS = [0, -1]

  return function() {
    var count = this.vertCount

    if(!count) {
      return
    }

    var projectionModel = this.setProjectionModel()

    var plot       = this.plot
    var width      = this.width
    var gl         = plot.gl
    var pixelRatio = plot.pixelRatio

    var color     = this.color

    var fillAttributes = this.fillShader.attributes

    this.lineBufferLo.bind()
    fillAttributes.aLo.pointer(gl.FLOAT, false, 16, 0)

    this.lineBufferHi.bind()

    var fill = this.fill

    if(fill[0] || fill[1] || fill[2] || fill[3]) {

      var fillShader = this.fillShader
      fillShader.bind()

      var fillUniforms = fillShader.uniforms
      this.setProjectionUniforms(fillUniforms, projectionModel)
      fillUniforms.depth = plot.nextDepthValue()

      fillAttributes.aHi.pointer(gl.FLOAT, false, 16, 0)
      fillAttributes.dHi.pointer(gl.FLOAT, false, 16, 8)

      gl.depthMask(true)
      gl.enable(gl.DEPTH_TEST)

      var fillColor = this.fillColor
      if(fill[0]) {
        fillUniforms.color        = fillColor[0]
        fillUniforms.projectAxis  = NX_AXIS
        fillUniforms.projectValue = 1
        gl.drawArrays(gl.TRIANGLES, 0, count)
      }

      if(fill[1]) {
        fillUniforms.color        = fillColor[1]
        fillUniforms.projectAxis  = NY_AXIS
        fillUniforms.projectValue = 1
        gl.drawArrays(gl.TRIANGLES, 0, count)
      }

      if(fill[2]) {
        fillUniforms.color        = fillColor[2]
        fillUniforms.projectAxis  = PX_AXIS
        fillUniforms.projectValue = 1
        gl.drawArrays(gl.TRIANGLES, 0, count)
      }

      if(fill[3]) {
        fillUniforms.color        = fillColor[3]
        fillUniforms.projectAxis  = PY_AXIS
        fillUniforms.projectValue = 1
        gl.drawArrays(gl.TRIANGLES, 0, count)
      }

      gl.depthMask(false)
      gl.disable(gl.DEPTH_TEST)
    }

    var shader = this.lineShader
    shader.bind()

    this.lineBufferLo.bind()
    shader.attributes.aLo.pointer(gl.FLOAT, false, 16, 0)
    shader.attributes.dLo.pointer(gl.FLOAT, false, 16, 8)

    this.lineBufferHi.bind()

    var uniforms = shader.uniforms
    this.setProjectionUniforms(uniforms, projectionModel)
    uniforms.color  = color
    uniforms.width  = width * pixelRatio
    uniforms.dashPattern = this.dashPattern.bind()
    uniforms.dashLength = this.dashLength * pixelRatio

    var attributes = shader.attributes
    attributes.aHi.pointer(gl.FLOAT, false, 16, 0)
    attributes.dHi.pointer(gl.FLOAT, false, 16, 8)

    gl.drawArrays(gl.TRIANGLES, 0, count)

    //Draw mitres
    if(width > 2 && !this.usingDashes) {
      var mshader = this.mitreShader

      this.lineBufferLo.bind()
      mshader.attributes.aLo.pointer(gl.FLOAT, false, 48, 0)

      this.lineBufferHi.bind()
      mshader.bind()

      var muniforms = mshader.uniforms
      this.setProjectionUniforms(muniforms, projectionModel)
      muniforms.color  = color
      muniforms.radius = width * pixelRatio

      mshader.attributes.aHi.pointer(gl.FLOAT, false, 48, 0)
      gl.drawArrays(gl.POINTS, 0, (count / 3) | 0)
    }
  }
})()

proto.drawPick = (function() {

  var PICK_OFFSET = [0, 0, 0, 0]

  return function(pickOffset) {

    var count      = this.vertCount
    var numPoints  = this.numPoints

    this.pickOffset = pickOffset
    if(!count) {
      return pickOffset + numPoints
    }

    var projectionModel = this.setProjectionModel()

    var plot       = this.plot
    var width      = this.width
    var gl         = plot.gl
    var pixelRatio = plot.pickPixelRatio

    var shader     = this.pickShader
    var pickBuffer = this.pickBuffer

    PICK_OFFSET[0] =  pickOffset         & 0xff
    PICK_OFFSET[1] = (pickOffset >>> 8)  & 0xff
    PICK_OFFSET[2] = (pickOffset >>> 16) & 0xff
    PICK_OFFSET[3] =  pickOffset >>> 24

    shader.bind()

    var uniforms = shader.uniforms
    this.setProjectionUniforms(uniforms, projectionModel)
    uniforms.width       = width * pixelRatio
    uniforms.pickOffset  = PICK_OFFSET

    var attributes = shader.attributes

    this.lineBufferHi.bind()
    attributes.aHi.pointer(gl.FLOAT, false, 16, 0)
    attributes.dHi.pointer(gl.FLOAT, false, 16, 8)

    this.lineBufferLo.bind()
    attributes.aLo.pointer(gl.FLOAT, false, 16, 0)

    //attributes.dLo.pointer(gl.FLOAT, false, 16, 8)

    pickBuffer.bind()
    attributes.pick0.pointer(gl.UNSIGNED_BYTE, false, 8, 0)
    attributes.pick1.pointer(gl.UNSIGNED_BYTE, false, 8, 4)

    gl.drawArrays(gl.TRIANGLES, 0, count)

    return pickOffset + numPoints
  }
})()

proto.pick = function(x, y, value) {
  var pickOffset = this.pickOffset
  var pointCount = this.numPoints
  if(value < pickOffset || value >= pickOffset + pointCount) {
    return null
  }
  var pointId = value - pickOffset
  var points = this.data
  return {
    object:    this,
    pointId:   pointId,
    dataCoord: [points[2 * pointId], points[2 * pointId + 1]]
  }
}

function deepCopy(arr) {
  return arr.map(function(x) {
    return x.slice()
  })
}

proto.update = function(options) {
  options = options || {}

  var gl = this.plot.gl
  var i, j, ptr, ax, ay

  this.color = (options.color || [0, 0, 1, 1]).slice()
  this.width = +(options.width || 1)
  this.fill = (options.fill || [false, false, false, false]).slice()
  this.fillColor = deepCopy(options.fillColor || [
      [0, 0, 0, 1],
      [0, 0, 0, 1],
      [0, 0, 0, 1],
      [0, 0, 0, 1]
    ])

  var dashes = options.dashes || [1]
  var dashLength = 0
  for(i = 0; i < dashes.length; ++i) {
    dashLength += dashes[i]
  }
  var dashData = pool.mallocUint8(dashLength)
  ptr = 0
  var fillColor = 255
  for(i = 0; i < dashes.length; ++i) {
    for(j = 0; j < dashes[i]; ++j) {
      dashData[ptr++] = fillColor
    }
    fillColor ^= 255
  }
  this.dashPattern.dispose()
  this.usingDashes = dashes.length > 1

  this.dashPattern = createTexture(gl, ndarray(dashData, [dashLength, 1, 4], [1, 0, 0]))
  this.dashPattern.minFilter = gl.NEAREST
  this.dashPattern.magFilter = gl.NEAREST
  this.dashLength = dashLength
  pool.free(dashData)

  var data = options.positions
  this.data = data

  var bounds = this.bounds
  bounds[0] = bounds[1] = Infinity
  bounds[2] = bounds[3] = -Infinity

  var numPoints = this.numPoints = data.length >>> 1
  if(numPoints === 0) {
    return
  }

  for(i = 0; i < numPoints; ++i) {
    ax = data[2 * i]
    ay = data[2 * i + 1]

    if (isNaN(ax) || isNaN(ay)) {
      continue
    }

    bounds[0] = Math.min(bounds[0], ax)
    bounds[1] = Math.min(bounds[1], ay)
    bounds[2] = Math.max(bounds[2], ax)
    bounds[3] = Math.max(bounds[3], ay)
  }

  if(bounds[0] === bounds[2]) bounds[2] += 1
  if(bounds[3] === bounds[1]) bounds[3] += 1

  //Generate line data
  var lineData    = pool.mallocFloat64(24 * (numPoints - 1))
  var lineDataHi  = pool.mallocFloat32(24 * (numPoints - 1))
  var lineDataLo  = pool.mallocFloat32(24 * (numPoints - 1))
  var pickData    = pool.mallocUint32(12 * (numPoints - 1))
  var lineDataPtr = lineDataHi.length
  var pickDataPtr = pickData.length
  ptr = numPoints

  var count = 0

  while(ptr > 1) {
    var id = --ptr
    ax = data[2 * ptr]
    ay = data[2 * ptr + 1]

    var next = id - 1
    var bx = data[2 * next]
    var by = data[2 * next + 1]

    if (isNaN(ax) || isNaN(ay) || isNaN(bx) || isNaN(by)) {
      continue
    }

    count += 1

    ax = (ax - bounds[0]) / (bounds[2] - bounds[0])
    ay = (ay - bounds[1]) / (bounds[3] - bounds[1])

    bx = (bx - bounds[0]) / (bounds[2] - bounds[0])
    by = (by - bounds[1]) / (bounds[3] - bounds[1])

    var dx = bx - ax
    var dy = by - ay

    var akey0 = id       | (1 << 24)
    var akey1 = (id - 1)
    var bkey0 = id
    var bkey1 = (id - 1) | (1 << 24)

    lineData[--lineDataPtr] = -dy
    lineData[--lineDataPtr] = -dx
    lineData[--lineDataPtr] = ay
    lineData[--lineDataPtr] = ax
    pickData[--pickDataPtr] = akey0
    pickData[--pickDataPtr] = akey1

    lineData[--lineDataPtr] = dy
    lineData[--lineDataPtr] = dx
    lineData[--lineDataPtr] = by
    lineData[--lineDataPtr] = bx
    pickData[--pickDataPtr] = bkey0
    pickData[--pickDataPtr] = bkey1

    lineData[--lineDataPtr] = -dy
    lineData[--lineDataPtr] = -dx
    lineData[--lineDataPtr] = by
    lineData[--lineDataPtr] = bx
    pickData[--pickDataPtr] = bkey0
    pickData[--pickDataPtr] = bkey1

    lineData[--lineDataPtr] = dy
    lineData[--lineDataPtr] = dx
    lineData[--lineDataPtr] = by
    lineData[--lineDataPtr] = bx
    pickData[--pickDataPtr] = bkey0
    pickData[--pickDataPtr] = bkey1

    lineData[--lineDataPtr] = -dy
    lineData[--lineDataPtr] = -dx
    lineData[--lineDataPtr] = ay
    lineData[--lineDataPtr] = ax
    pickData[--pickDataPtr] = akey0
    pickData[--pickDataPtr] = akey1

    lineData[--lineDataPtr] = dy
    lineData[--lineDataPtr] = dx
    lineData[--lineDataPtr] = ay
    lineData[--lineDataPtr] = ax
    pickData[--pickDataPtr] = akey0
    pickData[--pickDataPtr] = akey1
  }

  for(i = 0; i < lineData.length; i++) {
    lineDataHi[i] = lineData[i]
    lineDataLo[i] = lineData[i] - lineDataHi[i]
  }

  this.vertCount = 6 * count
  this.lineBufferHi.update(lineDataHi.subarray(lineDataPtr))
  this.lineBufferLo.update(lineDataLo.subarray(lineDataPtr))
  this.pickBuffer.update(pickData.subarray(pickDataPtr))

  pool.free(lineData)
  pool.free(lineDataHi)
  pool.free(lineDataLo)
  pool.free(pickData)
}

proto.dispose = function() {
  this.plot.removeObject(this)
  this.lineBufferLo.dispose()
  this.lineBufferHi.dispose()
  this.pickBuffer.dispose()
  this.lineShader.dispose()
  this.mitreShader.dispose()
  this.fillShader.dispose()
  this.pickShader.dispose()
  this.dashPattern.dispose()
}

function createLinePlot(plot, options) {
  var gl = plot.gl
  var lineBufferHi = createBuffer(gl)
  var lineBufferLo = createBuffer(gl)
  var pickBuffer   = createBuffer(gl)
  var dashPattern  = createTexture(gl, [1, 1])
  var lineShader   = createShader(gl, SHADERS.lineVertex,  SHADERS.lineFragment)
  var mitreShader  = createShader(gl, SHADERS.mitreVertex, SHADERS.mitreFragment)
  var fillShader   = createShader(gl, SHADERS.fillVertex,  SHADERS.fillFragment)
  var pickShader   = createShader(gl, SHADERS.pickVertex,  SHADERS.pickFragment)
  var linePlot     = new GLLine2D(
    plot,
    dashPattern,
    lineBufferHi,
    lineBufferLo,
    pickBuffer,
    lineShader,
    mitreShader,
    fillShader,
    pickShader)
  plot.addObject(linePlot)
  linePlot.update(options)
  return linePlot
}