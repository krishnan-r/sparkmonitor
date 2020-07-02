precision highp float;

attribute vec2 positionHi;
attribute vec2 positionLo;
attribute vec2 pixelOffset;

uniform vec2 scaleHi, scaleLo, translateHi, translateLo, pixelScale;

vec2 project(vec2 scHi, vec2 trHi, vec2 scLo, vec2 trLo, vec2 posHi, vec2 posLo) {
  return (posHi + trHi) * scHi
       + (posLo + trLo) * scHi
       + (posHi + trHi) * scLo
       + (posLo + trLo) * scLo;
}

void main() {
  vec3 scrPosition = vec3(
         project(scaleHi, translateHi, scaleLo, translateLo, positionHi, positionLo),
         1);
  gl_Position = vec4(
    scrPosition.xy + scrPosition.z * pixelScale * pixelOffset,
    0,
    scrPosition.z);
}
