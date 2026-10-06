const VERTEX = `
varying vec2 artworkUv;
void main() {
  artworkUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAGMENT = `
uniform sampler2D artwork;
uniform sampler2D waterMask;
uniform float time;
varying vec2 artworkUv;

vec2 bubbleMotion(vec2 p, vec2 center, float radius, float phase) {
  vec2 delta = p - center;
  float influence = 1.0 - smoothstep(radius * 0.7, radius * 1.85, length(delta));
  vec2 drift = vec2(sin(phase) * 2.6, cos(phase * 0.85) * 3.0);
  return influence * (drift + delta * sin(phase + 0.7) * 0.035);
}

void main() {
  vec2 p = vec2(artworkUv.x * 1361.0, (1.0 - artworkUv.y) * 644.0);
  vec4 original = texture2D(artwork, artworkUv);
  float water = texture2D(waterMask, artworkUv).r;
  float phase = time * 6.2831853 / 18.0;
  vec2 current = vec2(
    sin(p.y * 0.032 - phase) + sin(p.x * 0.019 + phase * 0.6) * 0.45,
    cos(p.x * 0.027 - phase * 0.8) + sin(p.y * 0.021 + phase) * 0.4
  );
  vec2 offset = current * water * 3.6;
  vec2 bubbles = vec2(0.0);
  bubbles += bubbleMotion(p, vec2(209.0,57.0), 15.0, phase + 0.2);
  bubbles += bubbleMotion(p, vec2(313.0,106.0), 17.0, phase + 0.8);
  bubbles += bubbleMotion(p, vec2(357.0,124.0), 20.0, phase + 1.5);
  bubbles += bubbleMotion(p, vec2(391.0,146.0), 18.0, phase + 2.2);
  bubbles += bubbleMotion(p, vec2(433.0,175.0), 15.0, phase + 2.8);
  bubbles += bubbleMotion(p, vec2(471.0,92.0), 24.0, phase + 3.4);
  bubbles += bubbleMotion(p, vec2(536.0,95.0), 26.0, phase + 4.0);
  bubbles += bubbleMotion(p, vec2(566.0,156.0), 19.0, phase + 4.7);
  bubbles += bubbleMotion(p, vec2(604.0,146.0), 26.0, phase + 5.3);
  bubbles += bubbleMotion(p, vec2(495.0,240.0), 23.0, phase + 5.9);
  // Coral appendages stay fixed while the blue-white bubbles gently drift.
  float cool = 1.0 - smoothstep(0.04, 0.16, original.r - original.b);
  offset += bubbles * cool;
  vec2 movingUv = vec2((p.x - offset.x) / 1361.0, 1.0 - (p.y - offset.y) / 644.0);
  vec4 color = texture2D(artwork, clamp(movingUv, 0.0, 1.0));
  float sheen = sin(p.x * 0.038 + p.y * 0.023 - phase * 1.4) * 0.022 * water;
  color.rgb += vec3(0.6, 0.9, 1.0) * sheen;
  gl_FragColor = color;
  #include <colorspace_fragment>
}`;

// Paint-space outlines protect the subjects; only surrounding water may flow.
const SUBJECTS = [
  [
    [76, 55],
    [119, 46],
    [190, 87],
    [285, 158],
    [368, 247],
    [448, 308],
    [546, 348],
    [666, 355],
    [785, 329],
    [924, 273],
    [1030, 269],
    [1078, 292],
    [1151, 314],
    [1226, 355],
    [1243, 406],
    [1220, 473],
    [1194, 541],
    [1190, 575],
    [1166, 589],
    [1135, 565],
    [1128, 501],
    [1105, 451],
    [1061, 395],
    [1050, 399],
    [1025, 467],
    [1000, 492],
    [980, 493],
    [976, 462],
    [992, 411],
    [1006, 365],
    [973, 342],
    [919, 384],
    [823, 454],
    [726, 511],
    [741, 544],
    [699, 563],
    [669, 558],
    [578, 514],
    [539, 503],
    [559, 552],
    [628, 599],
    [689, 611],
    [694, 633],
    [652, 644],
    [545, 644],
    [474, 599],
    [433, 530],
    [391, 452],
    [396, 487],
    [368, 501],
    [333, 481],
    [301, 462],
    [303, 521],
    [289, 567],
    [266, 593],
    [237, 592],
    [226, 568],
    [244, 530],
    [224, 489],
    [202, 451],
    [187, 376],
    [146, 315],
    [110, 246],
    [89, 183],
    [76, 124],
  ],
  [
    [968, 116],
    [1033, 116],
    [1049, 158],
    [1049, 217],
    [1037, 265],
    [999, 277],
    [956, 271],
    [908, 271],
    [900, 241],
    [921, 227],
    [954, 225],
    [955, 192],
    [978, 175],
    [979, 157],
  ],
];

function makeWaterMask(THREE, image) {
  const canvas = document.createElement("canvas");
  canvas.width = 1361;
  canvas.height = 644;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, 1361, 644);
  const source = ctx.getImageData(0, 0, 1361, 644);
  const mask = ctx.createImageData(1361, 644);
  for (let i = 0; i < source.data.length; i += 4) {
    const r = source.data[i] / 255;
    const g = source.data[i + 1] / 255;
    const b = source.data[i + 2] / 255;
    const light = Math.min(r, g, b);
    const strength =
      THREE.MathUtils.smoothstep(light, 0.45, 0.82) *
      (1 - THREE.MathUtils.smoothstep(r - b, 0.08, 0.24));
    mask.data[i] =
      mask.data[i + 1] =
      mask.data[i + 2] =
        Math.round(strength * 255);
    mask.data[i + 3] = 255;
  }
  ctx.putImageData(mask, 0, 0);
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 8;
  ctx.lineJoin = "round";
  SUBJECTS.forEach((points) => {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    points.slice(1).forEach((point) => ctx.lineTo(...point));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
  // Corner motifs are ornaments, not moving water.
  ctx.fillRect(0, 574, 80, 70);
  ctx.fillRect(1200, 427, 161, 217);
  // Soften mask edges to keep moving brushwork continuous.
  const soft = document.createElement("canvas");
  soft.width = 1361;
  soft.height = 644;
  const softCtx = soft.getContext("2d");
  softCtx.filter = "blur(1.2px)";
  softCtx.drawImage(canvas, 0, 0);
  return new THREE.CanvasTexture(soft);
}

export function createHeroWaterMotion(THREE, scene, src) {
  const uniforms = {
    artwork: { value: null },
    waterMask: { value: null },
    time: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1361, 644), material);
  mesh.position.set(1361 / 2, -644 / 2, -20);
  mesh.renderOrder = -2;
  mesh.visible = false;
  scene.add(mesh);
  let disposed = false;
  let mask;
  const texture = new THREE.TextureLoader().load(src, (loaded) => {
    if (disposed) {
      loaded.dispose();
      return;
    }
    try {
      loaded.colorSpace = THREE.SRGBColorSpace;
      mask = makeWaterMask(THREE, loaded.image);
      uniforms.artwork.value = loaded;
      uniforms.waterMask.value = mask;
      mesh.visible = true;
    } catch {
      // The original hero image remains visible if its pixels cannot be read.
      mesh.visible = false;
    }
  });
  return {
    update(time) {
      uniforms.time.value = time;
    },
    dispose() {
      disposed = true;
      texture.dispose();
      mask?.dispose();
    },
  };
}
