struct Ray {
  vec3 origin;
  vec3 direction;
} ray;

const vec2 vec = vec2(0.0);

#pragma glslify: n = require('./unsuffixable-child', a = vec.x, b = 5.0, c = vec, e = 2, f = ray.origin.xy)

void runner(in vec2 fragCoord) {
  gl_FragColor = vec4(n(fragCoord + vec2(d)), 1.0);
}


#pragma glslify: export(runner)
