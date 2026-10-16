export const gallerySkyVertex = `
  varying vec3 vSkyDirection;
  varying vec3 vViewDirection; // from the camera: the moon is infinitely far away, the same from anywhere
  void main() {
    vSkyDirection = position;
    vViewDirection = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const gallerySkyFragment = `
  uniform float uTime;
  uniform float uNight; // 0 day → 1 night
  uniform vec3 uMoon;   // direction of the moon's disc, as seen from wherever the camera stands
  varying vec3 vSkyDirection;
  varying vec3 vViewDirection;
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
      vec3 night = mix(vec3(0.02, 0.045, 0.12), vec3(0.003, 0.006, 0.022), pow(height, 0.55));
      // a glowing Milky Way band across the sky, mottled with dust
      float band = exp(-pow(dot(direction, normalize(vec3(0.35, 0.55, 0.76))), 2.0) / 0.035);
      float dust = fbm(direction * 9.0 + 4.0);
      night += vec3(0.05, 0.08, 0.2) * band * smoothstep(0.3, 0.75, dust) * 1.4 + vec3(0.04, 0.03, 0.09) * band * 0.5;
      // stars in three sizes; far more of them inside the Milky Way
      float stars = 0.0;
      for (int layer = 0; layer < 3; layer++) {
        float scale = layer == 0 ? 520.0 : layer == 1 ? 260.0 : 120.0;
        float rarity = layer == 0 ? 0.985 - band * 0.03 : layer == 1 ? 0.9955 - band * 0.006 : 0.9988;
        vec3 grid = direction * scale, cell = floor(grid);
        float point = 1.0 - smoothstep(0.05, layer == 2 ? 0.45 : 0.3, length(fract(grid) - 0.5));
        float twinkle = 0.5 + 0.5 * sin(uTime * (1.2 + hash(cell + 7.0) * 2.0) + hash(cell + 3.1) * 40.0);
        stars += step(rarity, hash(cell + float(layer) * 11.0)) * point * mix(0.55, 1.0, twinkle) * (layer == 0 ? 0.35 : layer == 1 ? 0.75 : 1.4);
      }
      night += vec3(0.8, 0.88, 1.0) * stars * smoothstep(0.38, 0.6, height);
      float m = dot(normalize(vViewDirection), normalize(uMoon));
      // the moon: a soft-edged disc with faint grey markings
      float disc = smoothstep(0.99815, 0.99845, m);
      float marks = fbm(direction * 160.0) * 0.35 + fbm(direction * 420.0) * 0.15;
      night = mix(night, vec3(0.97, 0.95, 0.88) * (1.0 - marks * 0.55), disc);
      night += vec3(0.16, 0.2, 0.34) * (1.0 - disc) * (pow(max(m, 0.0), 260.0) * 1.1 + pow(max(m, 0.0), 40.0) * 0.25 + pow(max(m, 0.0), 6.0) * 0.06);
      vec3 nightCloud = mix(vec3(0.006, 0.01, 0.026), vec3(0.05, 0.065, 0.1), clamp(0.5 + (density - light) * 5.0, 0.0, 1.0));
      night = mix(night, nightCloud, cloud * 0.45);
      sky = mix(sky, night, uNight);
    }
    gl_FragColor = vec4(sky, 1.0);
    #include <colorspace_fragment>
  }
`;
