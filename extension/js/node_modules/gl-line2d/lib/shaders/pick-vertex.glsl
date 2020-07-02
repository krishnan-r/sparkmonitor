precision highp float;

attribute vec2 aHi, aLo, dHi;
attribute vec4 pick0, pick1;

uniform vec2 scaleHi, translateHi, scaleLo, translateLo, screenShape;
uniform float width;

varying vec4 pickA, pickB;

#pragma glslify: baseProject = require("./baseProject.glsl")

void main() {
  vec2 p = baseProject(scaleHi, translateHi, scaleLo, translateLo, aHi, aLo);
  vec2 n = width * normalize(screenShape.yx * vec2(dHi.y, -dHi.x)) / screenShape.xy;
  gl_Position = vec4(p + n, 0, 1);
  pickA = pick0;
  pickB = pick1;
}