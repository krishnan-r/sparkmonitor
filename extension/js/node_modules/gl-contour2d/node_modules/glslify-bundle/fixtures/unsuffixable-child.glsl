vec3 child(vec2 coord) {
  return vec3(a * coord + b - c + float(e) * f, 1);
}

#pragma glslify: export(child)
