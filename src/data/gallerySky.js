export const gallerySkyVertex = `
  varying vec3 vSkyDirection;
  void main() {
    vSkyDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const gallerySkyFragment = `
  uniform float uTime;
  varying vec3 vSkyDirection;
  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
  }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float value = 0.0, amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p = p * 2.02 + 17.3;
      amplitude *= 0.5;
    }
    return value;
  }
  void main() {
    vec3 direction = normalize(vSkyDirection);
    float height = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 sky = mix(vec3(0.86, 0.93, 0.98), vec3(0.26, 0.57, 0.82), pow(height, 0.7));
    vec3 p = direction * 18.0 + vec3(uTime * 0.11, 0.0, uTime * 0.025);
    vec3 warp = vec3(fbm(p * 0.7), fbm(p * 0.7 + 8.4), fbm(p * 0.7 + 21.2));
    float density = fbm(p + warp * 1.1);
    float cloud = smoothstep(0.37, 0.61, density);
    float light = fbm(p + warp * 1.1 + vec3(-0.12, 0.2, 0.0));
    vec3 cloudColor = mix(vec3(0.48, 0.65, 0.76), vec3(1.0, 0.98, 0.92), clamp(0.55 + (density - light) * 5.0, 0.0, 1.0));
    sky = mix(sky, cloudColor, cloud);
    sky = mix(sky, vec3(0.93, 0.96, 0.99), pow(1.0 - height, 4.0) * 0.45);
    gl_FragColor = vec4(sky, 1.0);
    #include <colorspace_fragment>
  }
`;
