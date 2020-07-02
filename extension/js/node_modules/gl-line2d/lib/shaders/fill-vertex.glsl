precision highp float;

attribute vec2 aHi, aLo, dHi;

uniform vec2 scaleHi, translateHi, scaleLo, translateLo, projectAxis;
uniform float projectValue, depth;

#pragma glslify: baseProject = require("./baseProject.glsl")

void main() {
  vec2 p = baseProject(scaleHi, translateHi, scaleLo, translateLo, aHi, aLo);
  if(dHi.y < 0.0 || (dHi.y == 0.0 && dHi.x < 0.0)) {
    if(dot(p, projectAxis) < projectValue) {
      p = p * (1.0 - abs(projectAxis)) + projectAxis * projectValue;
    }
  }
  gl_Position = vec4(p, depth, 1);
}