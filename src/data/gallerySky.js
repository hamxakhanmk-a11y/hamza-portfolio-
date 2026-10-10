export const gallerySkyVertex = `
  varying vec3 vSkyDirection;
  void main() {
    vSkyDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const gallerySkyFragment = `
  uniform float uTime;
  uniform sampler2D uCloudEnvironment;
  varying vec3 vSkyDirection;
  void main() {
    vec3 direction = normalize(vSkyDirection);
    float longitude = atan(direction.x, -direction.z) / 6.2831853 + 0.5;
    float latitude = asin(clamp(direction.y, -1.0, 1.0)) / 3.14159265 + 0.5;
    vec2 uv = vec2(longitude, clamp(latitude, 0.002, 0.998));
    uv.x = fract(uv.x + sin(uTime * 0.015) * 0.0015);
    vec3 clouds = texture2D(uCloudEnvironment, uv).rgb;
    float height = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 clearSky = mix(vec3(0.82, 0.92, 0.98), vec3(0.20, 0.53, 0.72), height);
    // Feather the panorama join and zenith without repeating cloud columns.
    float join = smoothstep(0.0, 0.06, min(uv.x, 1.0 - uv.x));
    float zenith = 1.0 - smoothstep(0.91, 1.0, latitude);
    vec3 sky = mix(clearSky, clouds, join * zenith);
    sky = mix(sky, vec3(0.84, 0.94, 0.99), 0.16);
    gl_FragColor = vec4(sky, 1.0);
    #include <colorspace_fragment>
  }
`;
