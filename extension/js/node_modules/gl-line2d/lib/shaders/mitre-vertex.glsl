precision highp float;

attribute vec2 aHi, aLo;

uniform vec2 scaleHi, translateHi, scaleLo, translateLo;
uniform float radius;

#pragma glslify: baseProject = require("./baseProject.glsl")

void main() {
  vec2 p = baseProject(scaleHi, translateHi, scaleLo, translateLo, aHi, aLo);
  gl_Position = vec4(p, 0.0, 1.0);
  gl_PointSize = radius;
}