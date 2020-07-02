#pragma glslify: export(project)
vec2 project(vec2 scHi, vec2 trHi, vec2 scLo, vec2 trLo, vec2 posHi, vec2 posLo) {
  return (posHi + trHi) * scHi
       + (posLo + trLo) * scHi
       + (posHi + trHi) * scLo
       + (posLo + trLo) * scLo;
}
