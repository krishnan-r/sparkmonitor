precision mediump float;

uniform vec4 pickOffset;

varying vec4 pickA, pickB;

void main() {
  vec4 fragId = vec4(pickA.xyz, 0.0);
  if(pickB.w > pickA.w) {
    fragId.xyz = pickB.xyz;
  }

  fragId += pickOffset;

  fragId.y += floor(fragId.x / 256.0);
  fragId.x -= floor(fragId.x / 256.0) * 256.0;

  fragId.z += floor(fragId.y / 256.0);
  fragId.y -= floor(fragId.y / 256.0) * 256.0;

  fragId.w += floor(fragId.z / 256.0);
  fragId.z -= floor(fragId.z / 256.0) * 256.0;

  gl_FragColor = fragId / 255.0;
}