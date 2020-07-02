var glslify = require('glslify')

module.exports = {
  vertex: glslify('./shaders/vertex.glsl'),
  fragment: glslify('./shaders/fragment.glsl')
}
