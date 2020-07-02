precision highp float;

uniform vec4 color;
uniform vec2 screenShape;
uniform sampler2D dashPattern;
uniform float dashLength;

varying vec2 direction;

void main() {
  float t = fract(dot(direction, gl_FragCoord.xy) / dashLength);
  vec4 pcolor = color * texture2D(dashPattern, vec2(t, 0.0)).r;
  gl_FragColor = vec4(pcolor.rgb * pcolor.a, pcolor.a);
}