export const gallerySkyVertex = `
  varying vec3 vSkyDirection;
  void main() {
    vSkyDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const gallerySkyFragment = `
  uniform float uTime;
  uniform float uNight; // 0 day → 1 night
  uniform vec3 uMoon;   // direction of the moon (the night light comes from it)
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
    vec3 sky = mix(vec3(0.77, 0.85, 0.94), vec3(0.18, 0.49, 0.71), pow(height, 0.7));
    vec3 p = direction * 18.0 + vec3(uTime * 0.11, 0.0, uTime * 0.025);
    vec3 warp = vec3(fbm(p * 0.7), fbm(p * 0.7 + 8.4), fbm(p * 0.7 + 21.2));
    float density = fbm(p + warp * 1.1);
    float cloud = smoothstep(0.37, 0.61, density);
    float light = fbm(p + warp * 1.1 + vec3(-0.12, 0.2, 0.0));
    vec3 cloudColor = mix(vec3(0.32, 0.52, 0.72), vec3(0.98, 0.84, 0.86), clamp(0.55 + (density - light) * 5.0, 0.0, 1.0));
    sky = mix(sky, cloudColor, cloud);
    sky = mix(sky, vec3(0.86, 0.95, 0.96), pow(1.0 - height, 4.0) * 0.32);
    if (uNight > 0.0) {
      // night: deep navy, small twinkling stars, a soft moon with a halo, and faint silvery clouds
      // (colours here are linear light; the screen brightens them, so they're kept very low)
      vec3 night = mix(vec3(0.014, 0.024, 0.06), vec3(0.002, 0.004, 0.015), pow(height, 0.6));
      vec3 grid = direction * 320.0, cell = floor(grid);
      float star = step(0.9972, hash(cell)) * (1.0 - smoothstep(0.08, 0.32, length(fract(grid) - 0.5)));
      float twinkle = 0.55 + 0.45 * sin(uTime * 1.7 + hash(cell + 3.1) * 40.0);
      night += vec3(0.85, 0.9, 1.0) * star * twinkle * smoothstep(0.42, 0.62, height);
      float m = dot(direction, normalize(uMoon));
      night = mix(night, vec3(0.97, 0.95, 0.88), smoothstep(0.99905, 0.99935, m));
      night += vec3(0.16, 0.2, 0.34) * (pow(max(m, 0.0), 220.0) * 0.9 + pow(max(m, 0.0), 30.0) * 0.18 + pow(max(m, 0.0), 6.0) * 0.05);
      vec3 nightCloud = mix(vec3(0.006, 0.01, 0.026), vec3(0.05, 0.065, 0.1), clamp(0.5 + (density - light) * 5.0, 0.0, 1.0));
      night = mix(night, nightCloud, cloud * 0.45);
      sky = mix(sky, night, uNight);
    }
    gl_FragColor = vec4(sky, 1.0);
    #include <colorspace_fragment>
  }
`;
