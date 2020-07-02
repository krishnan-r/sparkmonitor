precision mediump float;

const float pi = 3.14;

#pragma glslify: run = require('./unsuffixable-source.glsl', d = pi)

void main() {
  run(gl_FragCoord.xy);
}
