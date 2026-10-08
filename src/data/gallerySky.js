export const gallerySkyVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const gallerySkyFragment = `
  uniform float uTime;
  varying vec2 vUv;
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float value = 0.0, amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p = mat2(0.8, -0.6, 0.6, 0.8) * p * 2.02 + 17.3;
      amplitude *= 0.5;
    }
    return value;
  }
  void main() {
    float height = clamp(vUv.y, 0.0, 1.0);
    vec3 sky = mix(vec3(0.86, 0.93, 0.98), vec3(0.26, 0.57, 0.82), pow(height, 0.7));
    vec2 p = vec2(vUv.x * 7.0, vUv.y * 4.0);
    p.x += uTime * 0.018;
    vec2 warp = vec2(fbm(p * 0.7), fbm(p * 0.7 + 8.4));
    float density = fbm(p + warp * 1.1);
    float cloud = smoothstep(0.43, 0.67, density);
    float light = fbm(p + warp * 1.1 + vec2(-0.12, 0.2));
    vec3 cloudColor = mix(vec3(0.70, 0.79, 0.87), vec3(1.0, 0.99, 0.97), smoothstep(0.40, 0.65, light));
    sky = mix(sky, cloudColor, cloud * 0.95);
    sky = mix(sky, vec3(0.93, 0.96, 0.99), pow(1.0 - height, 4.0) * 0.45);
    gl_FragColor = vec4(sky, 1.0);
    #include <colorspace_fragment>
  }
`;
