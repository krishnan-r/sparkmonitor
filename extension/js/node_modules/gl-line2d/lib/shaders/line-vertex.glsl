precision highp float;

attribute vec2 aHi, aLo, dHi, dLo;

uniform vec2 scaleHi, translateHi, scaleLo, translateLo, screenShape;
uniform float width;

varying vec2 direction;

#pragma glslify: baseProject = require("./baseProject.glsl")
#pragma glslify: dirProject = require("./dirProject.glsl")

void main() {
  vec2 p = baseProject(scaleHi, translateHi, scaleLo, translateLo, aHi, aLo);
  vec2 dir = dirProject(scaleHi, scaleLo, dHi, dLo);
  vec2 n = 0.5 * width * normalize(screenShape.yx * vec2(dir.y, -dir.x)) / screenShape.xy;
  vec2 tangent = normalize(screenShape.xy * dir);
  if(dir.x < 0.0 || (dir.x == 0.0 && dir.y < 0.0)) {
    direction = -tangent;
  } else {
    direction = tangent;
  }
  gl_Position = vec4(p + n, 0.0, 1.0);
}