#pragma glslify: export(project)
vec2 project(vec2 scHi, vec2 scLo, vec2 posHi, vec2 posLo) {
  return scHi * posHi
       + scLo * posHi
       + scHi * posLo
       + scLo * posLo;
}