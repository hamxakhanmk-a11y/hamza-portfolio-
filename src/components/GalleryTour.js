'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TOUR_SLOTS } from '@/data/galleryTour';

// A sunlit 3D gallery the visitor glides through by scrolling. Paintings are real objects on the walls,
// so they stay perfectly still; the camera follows a smooth path with gentle pauses at each painting.

// ── Layout (metres) ─────────────────────────────────────────────
// Ground hall from the entrance to an arch, a double-height stair hall with a glass wall,
// then the first-floor hall (glass on the right, paintings on the left) ending at a window.
const HALL_HALF_WIDTH = 4;
const HALL_HEIGHT = 7; // ground hall
const UPPER_FLOOR = 4.6; // first-floor level
const UPPER_HEIGHT = 6.2; // first-floor room height
const FIRST_PAINTING_Z = -14;
const UPPER_FIRST_Z = -72;
const PAINTING_SPACING = 6.5;
const HANG_HEIGHT = 2.35;
const EYE_HEIGHT = 1.75;
const GROUND_START = 12;
const GROUND_END = -51; // arch into the stair hall
const STAIR_START_Z = -55;
const STEPS = 24;
const STEP_RUN = 0.4;
const STAIR_END_Z = STAIR_START_Z - STEPS * STEP_RUN;
const END_Z = -113;
const SKYLIGHT_HALF_WIDTH = 1.5;
const BEAM_SPACING = 0.95;
const STOP_SCREEN_SHARE = 72; // svh of scrolling per camera stop

const WALL = 0xf5f3ef;
const FLOOR = 0xefece8;
const STONE = 0xf7f4f0;
const FOG = 0xf6f3f1;

function optimizedImage(url) {
  return `/_next/image?url=${encodeURIComponent(url)}&w=1080&q=75`;
}

const smootherstep = t => t * t * t * (t * (t * 6 - 15) + 10);
// Slows down around each stop without ever quite stopping: a dwell, not a halt.
const dwell = t => 0.3 * t + 0.7 * smootherstep(t);

function cssFont(variable, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `${value}, ${fallback}` : fallback;
}

function hasTransparentCorners(image) {
  const size = 24;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  return [[1, 1], [size - 2, 1], [1, size - 2], [size - 2, size - 2]].every(([x, y]) => data[(y * size + x) * 4 + 3] < 40);
}

function labelCanvas(artwork, fontFamily, align) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.textAlign = align;
  const x = align === 'left' ? 24 : 1000;
  const words = String(artwork.title || '').toUpperCase().split(/\s+/);
  ctx.font = `500 76px ${fontFamily}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > 940 && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  ctx.fillStyle = '#4b4149';
  lines.slice(0, 4).forEach((text, k) => ctx.fillText(text, x, 20 + k * 86));
  let y = 20 + Math.min(lines.length, 4) * 86 + 26;
  ctx.fillStyle = '#ed7189';
  ctx.fillRect(align === 'left' ? x : x - 90, y, 90, 3);
  y += 30;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '5px';
  ctx.font = `500 30px ${fontFamily}`;
  ctx.fillStyle = 'rgba(75,65,73,0.8)';
  const meta = [artwork.size, artwork.medium].filter(Boolean).join('  ·  ').toUpperCase();
  if (meta) { ctx.fillText(meta, x, y); y += 46; }
  if (artwork.available === false) ctx.fillText('SOLD', x, y);
  else if (artwork.price) ctx.fillText(String(artwork.price).toUpperCase(), x, y);
  return canvas;
}

function titleCanvas(name, fontFamily) {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 250px ${fontFamily}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '18px';
  // pale stone with a pearl sheen
  const pearl = ctx.createLinearGradient(0, 160, 2048, 420);
  pearl.addColorStop(0, '#efe3ea');
  pearl.addColorStop(0.35, '#e6e3f1');
  pearl.addColorStop(0.6, '#e2eeec');
  pearl.addColorStop(1, '#f1e6e0');
  ctx.fillStyle = pearl;
  ctx.fillText(name.toUpperCase(), 1024, 400);
  ctx.font = `500 92px ${fontFamily}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '40px';
  ctx.fillStyle = '#8f7f98';
  ctx.fillText('PORTFOLIO', 1024, 600);
  return canvas;
}

function radialCanvas(inner, outer) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(128, 110, 0, 128, 128, 128);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return canvas;
}

function shaftCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  for (let x = 0; x < 512; x++) {
    // stripes matching the skylight beams, fading towards the floor
    const stripe = 0.5 + 0.5 * Math.cos((x / 512) * Math.PI * 2 * 8);
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, `rgba(255,246,236,${0.9 * stripe})`);
    g.addColorStop(1, 'rgba(255,246,236,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 1, 256);
  }
  return canvas;
}

function dotCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return canvas;
}

export default function GalleryTour({ slots, artistName }) {
  const rootRef = useRef(null);
  const hostRef = useRef(null);
  const router = useRouter();
  const [status, setStatus] = useState('loading'); // loading | ready | unsupported
  const [stop, setStop] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [progress, setProgress] = useState(0);
  const hung = slots.filter(entry => entry.artwork).map(entry => ({ ...entry, place: TOUR_SLOTS.find(s => s.id === entry.slot) })).filter(entry => entry.place);
  // camera stops: entrance title, the ground-floor paintings, the stairs, the first-floor paintings, the window at the end
  let number = 0;
  const paintingStops = floor => hung.filter(entry => entry.place.floor === floor).sort((a, b) => a.place.id - b.place.id).map(entry => ({ kind: 'painting', number: ++number, ...entry }));
  const tourStops = [{ kind: 'entrance' }, ...paintingStops('ground'), { kind: 'stairs' }, ...paintingStops('upper'), { kind: 'end' }];
  const stopCount = tourStops.length;

  useEffect(() => {
    if (hung.length === 0) return undefined;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const [THREE, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { ShaderPass }, { OutputPass }, { RoomEnvironment }] = await Promise.all([
        import('three'),
        import('three/addons/postprocessing/EffectComposer.js'),
        import('three/addons/postprocessing/RenderPass.js'),
        import('three/addons/postprocessing/UnrealBloomPass.js'),
        import('three/addons/postprocessing/ShaderPass.js'),
        import('three/addons/postprocessing/OutputPass.js'),
        import('three/addons/environments/RoomEnvironment.js'),
      ]);
      if (disposed || !hostRef.current) return;
      const host = hostRef.current;
      const narrow = window.innerWidth < 768;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      } catch {
        setStatus('unsupported');
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, narrow ? 1.25 : 1.75));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.92;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      host.appendChild(renderer.domElement);
      renderer.domElement.style.display = 'block';

      const disposables = [];
      const keep = item => { disposables.push(item); return item; };
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(FOG);
      scene.fog = new THREE.Fog(FOG, 26, 95);
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTexture = keep(pmrem.fromScene(new RoomEnvironment(), 0.04).texture);
      scene.environment = envTexture;
      scene.environmentIntensity = 0.3;
      pmrem.dispose();

      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 160);
      const fontFamily = cssFont('--font-cormorant', 'Georgia, serif');
      await (document.fonts?.ready || Promise.resolve());
      const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
      const canvasTexture = (canvas, repeat) => {
        const texture = keep(new THREE.CanvasTexture(canvas));
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = maxAnisotropy;
        if (repeat) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(...repeat); }
        return texture;
      };

      // ── Materials ──
      const wallMat = keep(new THREE.MeshStandardMaterial({ color: WALL, roughness: 0.95 }));
      const floorMat = keep(new THREE.MeshStandardMaterial({ color: FLOOR, roughness: 0.38 }));
      const stoneMat = keep(new THREE.MeshStandardMaterial({ color: STONE, roughness: 0.8 }));
      const goldMat = keep(new THREE.MeshStandardMaterial({ color: 0xc9a25e, metalness: 0.85, roughness: 0.32 }));
      const skyMat = keep(new THREE.MeshBasicMaterial({ color: 0xfffbf8, fog: false, toneMapped: false }));

      const add = (geometry, material, position, options = {}) => {
        const mesh = new THREE.Mesh(keep(geometry), material);
        mesh.position.set(...position);
        if (options.rotation) mesh.rotation.set(...options.rotation);
        mesh.castShadow = options.cast ?? true;
        mesh.receiveShadow = options.receive ?? true;
        scene.add(mesh);
        return mesh;
      };
      const TALL_TOP = UPPER_FLOOR + UPPER_HEIGHT;
      const sunDirection = new THREE.Vector3(0.55, 1, -0.32).normalize(); // towards the sun

      // ── Ceilings: slabs either side of a slatted skylight, cornices, and the sun shafts below ──
      const beamGeo = keep(new THREE.BoxGeometry(SKYLIGHT_HALF_WIDTH * 2, 0.4, 0.26));
      const beamMeshes = [];
      const shaftSource = canvasTexture(shaftCanvas());
      const matrix = new THREE.Matrix4();
      const ceiling = (zFrom, zTo, baseY, top) => {
        const len = zFrom - zTo, mid = (zFrom + zTo) / 2, height = top - baseY;
        const slabWidth = HALL_HALF_WIDTH - SKYLIGHT_HALF_WIDTH;
        for (const side of [-1, 1]) {
          add(new THREE.BoxGeometry(slabWidth, 0.4, len), stoneMat, [side * (SKYLIGHT_HALF_WIDTH + slabWidth / 2), top + 0.2, mid]);
          add(new THREE.BoxGeometry(0.3, 0.22, len), stoneMat, [side * (HALL_HALF_WIDTH - 0.15), top - 0.11, mid], { cast: false });
        }
        const beams = new THREE.InstancedMesh(beamGeo, stoneMat, Math.ceil(len / BEAM_SPACING));
        for (let k = 0; k < beams.count; k++) {
          matrix.makeTranslation(0, top + 0.2, zFrom - BEAM_SPACING / 2 - k * BEAM_SPACING);
          beams.setMatrixAt(k, matrix);
        }
        beams.castShadow = true;
        beams.receiveShadow = true;
        scene.add(beams);
        beamMeshes.push(beams);
        add(new THREE.PlaneGeometry(SKYLIGHT_HALF_WIDTH * 2 + 1, len), skyMat, [0, top + 1.6, mid], { rotation: [Math.PI / 2, 0, 0], cast: false, receive: false });
        const shaftTex = keep(shaftSource.clone());
        shaftTex.wrapS = THREE.RepeatWrapping;
        shaftTex.repeat.set(len / (BEAM_SPACING * 8), 1);
        const shaftMat = keep(new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: 0.025, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
        for (const offset of [-0.6, 0.6]) {
          const shaft = add(new THREE.PlaneGeometry(len, height * 1.15), shaftMat, [0, 0, mid], { cast: false, receive: false });
          // lean the plane along the sun's direction from the skylight down to the floor
          shaft.rotation.set(0, Math.PI / 2, 0);
          shaft.rotateX(-Math.atan2(sunDirection.x, sunDirection.y));
          shaft.position.set(offset - (sunDirection.x / sunDirection.y) * (height / 2), baseY + height / 2, mid);
        }
      };

      // ── Columns and arches ──
      const column = (x, z, baseY, height) => {
        const shaft = height - 1.05;
        add(new THREE.CylinderGeometry(0.27, 0.3, shaft, 28), stoneMat, [x, baseY + 0.32 + shaft / 2, z]);
        add(new THREE.BoxGeometry(0.78, 0.32, 0.78), stoneMat, [x, baseY + 0.16, z]);
        add(new THREE.CylinderGeometry(0.42, 0.29, 0.32, 28), stoneMat, [x, baseY + height - 0.57, z]);
        add(new THREE.BoxGeometry(0.86, 0.16, 0.86), stoneMat, [x, baseY + height - 0.33, z]);
      };
      const wallWithOpening = (height, hole) => {
        const shape = new THREE.Shape();
        shape.moveTo(-HALL_HALF_WIDTH, 0);
        shape.lineTo(HALL_HALF_WIDTH, 0);
        shape.lineTo(HALL_HALF_WIDTH, height);
        shape.lineTo(-HALL_HALF_WIDTH, height);
        shape.lineTo(-HALL_HALF_WIDTH, 0);
        shape.holes.push(hole);
        return shape;
      };
      const archedHole = (halfWidth, bottom, spring) => {
        const hole = new THREE.Path();
        hole.moveTo(-halfWidth, bottom);
        hole.lineTo(-halfWidth, spring);
        hole.absarc(0, spring, halfWidth, Math.PI, 0, true);
        hole.lineTo(halfWidth, bottom);
        hole.lineTo(-halfWidth, bottom);
        return hole;
      };
      const archWall = (z, baseY, height, openingHalfWidth, springHeight) => {
        const geometry = new THREE.ExtrudeGeometry(wallWithOpening(height, archedHole(openingHalfWidth, 0, springHeight)), { depth: 0.7, bevelEnabled: false, curveSegments: 40 });
        add(geometry, wallMat, [0, baseY, z - 0.35]);
        column(-openingHalfWidth - 0.55, z + 0.75, baseY, height);
        column(openingHalfWidth + 0.55, z + 0.75, baseY, height);
      };

      // ── Ground hall ──
      add(new THREE.PlaneGeometry(HALL_HALF_WIDTH * 2, GROUND_START - STAIR_START_Z), floorMat, [0, 0, (GROUND_START + STAIR_START_Z) / 2], { rotation: [-Math.PI / 2, 0, 0], cast: false });
      const groundLen = GROUND_START - GROUND_END, groundMid = (GROUND_START + GROUND_END) / 2;
      for (const side of [-1, 1]) {
        add(new THREE.PlaneGeometry(groundLen, HALL_HEIGHT), wallMat, [side * HALL_HALF_WIDTH, HALL_HEIGHT / 2, groundMid], { rotation: [0, -side * Math.PI / 2, 0], cast: false });
        add(new THREE.BoxGeometry(0.06, 0.16, groundLen), stoneMat, [side * (HALL_HALF_WIDTH - 0.03), 0.08, groundMid], { cast: false });
      }
      ceiling(GROUND_START, GROUND_END, 0, HALL_HEIGHT);
      add(new THREE.PlaneGeometry(HALL_HALF_WIDTH * 2, HALL_HEIGHT), wallMat, [0, HALL_HEIGHT / 2, GROUND_START], { rotation: [0, Math.PI, 0], cast: false });
      archWall(-5, 0, HALL_HEIGHT, 2.3, 3.8);
      archWall(FIRST_PAINTING_Z - PAINTING_SPACING * 3.5, 0, HALL_HEIGHT, 2.3, 3.9);
      archWall(GROUND_END, 0, HALL_HEIGHT, 2.3, 3.9);
      const benchGeo = keep(new THREE.BoxGeometry(1.0, 0.42, 2.2));
      add(benchGeo, stoneMat, [0, 0.21, FIRST_PAINTING_Z - PAINTING_SPACING * 1.5]);

      // ── Stair hall and first floor: one tall volume with a glass wall on the right ──
      const tallLen = GROUND_END - END_Z, tallMid = (GROUND_END + END_Z) / 2;
      add(new THREE.PlaneGeometry(tallLen, TALL_TOP), wallMat, [-HALL_HALF_WIDTH, TALL_TOP / 2, tallMid], { rotation: [0, Math.PI / 2, 0], cast: false });
      add(new THREE.BoxGeometry(HALL_HALF_WIDTH * 2, TALL_TOP - HALL_HEIGHT, 0.7), wallMat, [0, (HALL_HEIGHT + TALL_TOP) / 2, GROUND_END - 0.35]);
      ceiling(GROUND_END, END_Z, 0, TALL_TOP);
      // glazing: full-height glass between piers, with a slim mullion grid
      add(new THREE.PlaneGeometry(tallLen, TALL_TOP), skyMat, [HALL_HALF_WIDTH + 0.4, TALL_TOP / 2, tallMid], { rotation: [0, -Math.PI / 2, 0], cast: false, receive: false });
      for (let z = GROUND_END; z >= END_Z; z -= 4.2) add(new THREE.BoxGeometry(0.5, TALL_TOP, 0.5), wallMat, [HALL_HALF_WIDTH + 0.1, TALL_TOP / 2, z]);
      for (let z = GROUND_END - 2.1; z > END_Z; z -= 4.2) add(new THREE.BoxGeometry(0.08, TALL_TOP, 0.08), stoneMat, [HALL_HALF_WIDTH + 0.3, TALL_TOP / 2, z], { cast: false });
      for (let y = 2.4; y < TALL_TOP - 0.5; y += 2.4) add(new THREE.BoxGeometry(0.08, 0.08, tallLen), stoneMat, [HALL_HALF_WIDTH + 0.3, y, tallMid], { cast: false });
      // stairs: a wide flight rising to the first floor, each riser a shade darker so the steps read
      const riserMat = keep(new THREE.MeshStandardMaterial({ color: 0xe6e2dd, roughness: 0.9 }));
      const rise = UPPER_FLOOR / STEPS;
      for (let k = 0; k < STEPS; k++) {
        const h = rise * (k + 1);
        const z = STAIR_START_Z - STEP_RUN * k;
        add(new THREE.BoxGeometry(HALL_HALF_WIDTH * 2, h, STEP_RUN), floorMat, [0, h / 2, z - STEP_RUN / 2]);
        add(new THREE.PlaneGeometry(HALL_HALF_WIDTH * 2, rise - 0.02), riserMat, [0, h - rise / 2, z + 0.005], { cast: false });
      }
      // first-floor slab and skirting
      const upperLen = STAIR_END_Z - END_Z, upperMid = (STAIR_END_Z + END_Z) / 2;
      add(new THREE.BoxGeometry(HALL_HALF_WIDTH * 2, 0.45, upperLen), floorMat, [0, UPPER_FLOOR - 0.225, upperMid]);
      add(new THREE.BoxGeometry(0.06, 0.16, upperLen), stoneMat, [-(HALL_HALF_WIDTH - 0.03), UPPER_FLOOR + 0.08, upperMid], { cast: false });
      archWall(UPPER_FIRST_Z - PAINTING_SPACING * 2.5, UPPER_FLOOR, UPPER_HEIGHT, 2.3, 3.6);
      add(benchGeo, stoneMat, [0, UPPER_FLOOR + 0.21, UPPER_FIRST_Z - PAINTING_SPACING * 3.8]);
      // end wall with a tall arched window full of soft sky
      add(new THREE.ExtrudeGeometry(wallWithOpening(UPPER_HEIGHT, archedHole(1.6, 0.5, 3.5)), { depth: 0.5, bevelEnabled: false, curveSegments: 40 }), wallMat, [0, UPPER_FLOOR, END_Z]);
      add(new THREE.PlaneGeometry(12, 12), skyMat, [0, UPPER_FLOOR + 3, END_Z - 3], { cast: false, receive: false });
      for (let k = -1; k <= 1; k++) add(new THREE.BoxGeometry(0.05, 4.8, 0.05), stoneMat, [k * 0.8, UPPER_FLOOR + 2.9, END_Z + 0.25], { cast: false });
      for (const y of [1.9, 3.3]) add(new THREE.BoxGeometry(3.2, 0.05, 0.05), stoneMat, [0, UPPER_FLOOR + y, END_Z + 0.25], { cast: false });

      // ── Light ──
      scene.add(new THREE.HemisphereLight(0xffffff, 0xe6e2de, 0.72));
      const sun = new THREE.DirectionalLight(0xfff0e2, 3.1);
      sun.castShadow = true;
      sun.shadow.mapSize.set(narrow ? 1024 : 2048, narrow ? 1024 : 2048);
      Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 80 });
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 0.03;
      sun.shadow.radius = 3;
      scene.add(sun, sun.target);

      // dust drifting in the light
      const dustCount = narrow ? 160 : 420;
      const dustPositions = new Float32Array(dustCount * 3);
      for (let k = 0; k < dustCount; k++) {
        dustPositions[k * 3] = (Math.random() - 0.5) * HALL_HALF_WIDTH * 1.8;
        dustPositions[k * 3 + 1] = 0.4 + Math.random() * (HALL_HEIGHT - 1);
        dustPositions[k * 3 + 2] = (Math.random() - 0.5) * 24;
      }
      const dustGeo = keep(new THREE.BufferGeometry());
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
      const dustMat = keep(new THREE.PointsMaterial({ size: 0.035, map: canvasTexture(dotCanvas()), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff6ea }));
      const dust = new THREE.Points(dustGeo, dustMat);
      scene.add(dust);

      // ── Entrance title ──
      const titleTex = canvasTexture(titleCanvas(artistName, fontFamily));
      const titleWidth = 6.4, titleHeight = titleWidth * (720 / 2048);
      for (let layer = 14; layer >= 0; layer--) {
        // stacked layers give the letters depth; the deeper ones are tinted like shaded stone
        const tint = layer === 0 ? 0xffffff : new THREE.Color(0x9d90a8).lerp(new THREE.Color(0xd9cfdc), layer / 14).getHex();
        const material = keep(new THREE.MeshBasicMaterial({ map: titleTex, transparent: true, alphaTest: 0.35, color: tint, toneMapped: false }));
        add(new THREE.PlaneGeometry(titleWidth, titleHeight), material, [0, titleHeight / 2 + 0.05, -0.4 - layer * 0.012], { cast: layer === 7, receive: false });
      }

      // ── Paintings ──
      const placed = new Map(); // slot id -> where it hangs
      for (const { place } of hung) {
        const k = TOUR_SLOTS.filter(s => s.floor === place.floor).findIndex(s => s.id === place.id);
        const upper = place.floor === 'upper';
        placed.set(place.id, { z: (upper ? UPPER_FIRST_Z : FIRST_PAINTING_Z) - k * PAINTING_SPACING, side: place.side, baseY: upper ? UPPER_FLOOR : 0 });
      }
      const loader = new THREE.TextureLoader();
      const glowTex = canvasTexture(radialCanvas('rgba(255,244,230,0.22)', 'rgba(255,244,230,0)'));
      const glowMat = keep(new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      const paintingMeshes = [];
      await Promise.all(hung.map(async ({ artwork, place }) => {
        const { z, side, baseY } = placed.get(place.id);
        const group = new THREE.Group();
        group.position.set(side * (HALL_HALF_WIDTH - 0.02), baseY + HANG_HEIGHT, z);
        group.rotation.y = -side * Math.PI / 2;
        scene.add(group);
        let texture;
        try {
          texture = keep(await loader.loadAsync(optimizedImage(artwork.image_url)));
        } catch {
          return;
        }
        if (disposed) return;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = maxAnisotropy;
        const image = texture.image;
        const aspect = image.width / image.height;
        let height = 2.3, width = height * aspect;
        if (width > 3.0) { width = 3.0; height = width / aspect; }
        const cutOut = artwork.round || hasTransparentCorners(image);
        // unlit and untoned, so the painting shows exactly as its photograph
        const art = new THREE.Mesh(
          keep(cutOut ? (artwork.round ? new THREE.CircleGeometry(height / 2, 72) : new THREE.PlaneGeometry(width, height)) : new THREE.BoxGeometry(width, height, 0.045)),
          keep(new THREE.MeshBasicMaterial({ map: texture, transparent: cutOut, alphaTest: cutOut ? 0.04 : 0, toneMapped: false })),
        );
        art.position.z = cutOut ? 0.025 : 0.06;
        art.castShadow = true;
        if (cutOut) art.customDepthMaterial = keep(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: texture, alphaTest: 0.5 }));
        art.userData = { id: artwork.id };
        group.add(art);
        paintingMeshes.push(art);
        if (!cutOut) {
          // a slim gold frame
          const f = 0.07, d = 0.09;
          for (const [w, h, x, y] of [[width + 2 * f, f, 0, height / 2 + f / 2], [width + 2 * f, f, 0, -height / 2 - f / 2], [f, height, -width / 2 - f / 2, 0], [f, height, width / 2 + f / 2, 0]]) {
            const bar = new THREE.Mesh(keep(new THREE.BoxGeometry(w, h, d)), goldMat);
            bar.position.set(x, y, d / 2);
            bar.castShadow = true;
            group.add(bar);
          }
        }
        // a warm wash of light on the wall, as if from a picture light
        const glow = new THREE.Mesh(keep(new THREE.PlaneGeometry(width * 1.9 + 1.4, height * 1.7 + 1.2)), glowMat);
        glow.position.set(0, 0.25, 0.012);
        group.add(glow);
        // title beside the painting, on the side the visitor approaches from
        const labelTex = canvasTexture(labelCanvas(artwork, fontFamily, side > 0 ? 'right' : 'left'));
        const label = new THREE.Mesh(keep(new THREE.PlaneGeometry(2.1, 2.1 * (640 / 1024))), keep(new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, depthWrite: false, toneMapped: false })));
        label.position.set(side > 0 ? -(width / 2 + 1.55) : width / 2 + 1.55, -0.35, 0.015);
        group.add(label);
      }));
      if (disposed) return;

      // ── Camera path ──
      // start before the title, rise over it, pass the arch, then walk the hall looking ahead
      // and turn to face each painting; between paintings the gaze returns down the hall
      const V = (x, y, z) => new THREE.Vector3(x, y, z);
      const keyPositions = [V(0, 1.8, 9), V(0, 3.3, 1.2), V(0, EYE_HEIGHT, -6.5)];
      const keyTargets = [V(0, 1.45, -0.4), V(0, 2.1, -12), V(0, 2.0, -22)];
      const stopKeys = [0]; // keyframe index of each stop
      let previous = { z: -6.5, baseY: 0, first: true };
      for (const tourStop of tourStops.slice(1)) {
        if (tourStop.kind === 'painting') {
          const { z, side, baseY } = placed.get(tourStop.slot);
          const eye = baseY + EYE_HEIGHT;
          if (!previous.first) {
            keyPositions.push(V(0, eye, (previous.z + z) / 2 + 1.2));
            keyTargets.push(V(side * 1.2, baseY + 2.0, z - 9));
          }
          keyPositions.push(V(-side * 1.15, eye, z + 1.7));
          keyTargets.push(V(side * HALL_HALF_WIDTH, baseY + HANG_HEIGHT - 0.05, z - 0.15));
          previous = { z, baseY };
        } else if (tourStop.kind === 'stairs') {
          // through the arch, up the flight, and out onto the first floor
          keyPositions.push(V(0, EYE_HEIGHT, STAIR_START_Z + 4));
          keyTargets.push(V(0, 3.4, STAIR_END_Z - 2));
          keyPositions.push(V(0, EYE_HEIGHT + UPPER_FLOOR / 2, (STAIR_START_Z + STAIR_END_Z) / 2));
          keyTargets.push(V(0, UPPER_FLOOR + 3.2, STAIR_END_Z - 10));
          keyPositions.push(V(0, UPPER_FLOOR + EYE_HEIGHT, STAIR_END_Z - 1.5));
          keyTargets.push(V(0, UPPER_FLOOR + 2.2, STAIR_END_Z - 16));
          previous = { z: STAIR_END_Z - 1.5, baseY: UPPER_FLOOR };
        } else {
          const eye = previous.baseY + EYE_HEIGHT;
          keyPositions.push(V(0, eye, (previous.z + END_Z) / 2 + 2));
          keyTargets.push(V(0, previous.baseY + 3.0, END_Z));
          keyPositions.push(V(0, eye + 0.2, END_Z + 9));
          keyTargets.push(V(0, previous.baseY + 3.4, END_Z));
        }
        stopKeys.push(keyPositions.length - 1);
      }
      const positionCurve = new THREE.CatmullRomCurve3(keyPositions, false, 'centripetal');
      const targetCurve = new THREE.CatmullRomCurve3(keyTargets, false, 'centripetal');
      const segments = keyPositions.length - 1;
      // scroll stops -> path parameter (a stop-to-stop move can span several keyframes)
      const stopToKey = s => {
        const i = Math.min(Math.floor(s), stopKeys.length - 2);
        const f = Math.min(1, s - i);
        return stopKeys[i] + (stopKeys[i + 1] - stopKeys[i]) * dwell(f);
      };
      const lookPoint = new THREE.Vector3();
      const sway = { x: 0, y: 0, tx: 0, ty: 0 };
      const placeCamera = s => {
        const t = Math.min(1, Math.max(0, stopToKey(s) / segments));
        positionCurve.getPoint(t, camera.position);
        targetCurve.getPoint(t, lookPoint);
        camera.lookAt(lookPoint);
        // a breath of handheld drift and the pointer's pull, for a cinematic feel
        camera.rotateY(sway.x);
        camera.rotateX(sway.y);
        // keep the sun's shadow map and the dust around what the camera sees
        const floorY = camera.position.y - EYE_HEIGHT;
        sun.target.position.set(0, floorY, camera.position.z - 7);
        sun.position.copy(sun.target.position).addScaledVector(sunDirection, 30);
        dust.position.set(0, floorY, camera.position.z - 6);
      };

      // ── Post-processing ──
      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), narrow ? 0.16 : 0.22, 0.55, 1.6);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
      const grade = new ShaderPass({
        uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAspect: { value: 1 } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `
          uniform sampler2D tDiffuse; uniform float uTime; uniform float uAspect; varying vec2 vUv;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
          void main() {
            vec2 c = vUv - 0.5;
            // faint pearl fringe toward the edges
            float edge = dot(c, c);
            vec3 col;
            col.r = texture2D(tDiffuse, vUv + c * edge * 0.012).r;
            col.g = texture2D(tDiffuse, vUv).g;
            col.b = texture2D(tDiffuse, vUv - c * edge * 0.012).b;
            // pastel grade: lift the shadows toward lavender and the highlights toward warm pink
            float l = dot(col, vec3(0.299, 0.587, 0.114));
            col = col * vec3(1.01, 0.995, 1.015);
            col += vec3(0.008, 0.004, 0.012) * (1.0 - l);
            // gentle vignette and film grain
            col *= 1.0 - edge * 0.35;
            col += (hash(vUv * vec2(uAspect, 1.0) * 900.0 + uTime) - 0.5) * 0.018;
            gl_FragColor = vec4(col, 1.0);
          }`,
      });
      composer.addPass(grade);

      // ── Loop ──
      let target = 0;
      let current = 0;
      let lastStop = -1;
      let lastProgress = -1;
      let visible = true;
      let frameId = 0;
      let lastTime = performance.now();
      const clockStart = lastTime;

      const readScroll = () => {
        const root = rootRef.current;
        if (!root) return;
        const rect = root.getBoundingClientRect();
        const travel = root.offsetHeight - window.innerHeight;
        const p = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
        target = p * (stopKeys.length - 1);
        if (Math.abs(p - lastProgress) > 0.002) { lastProgress = p; setProgress(p); }
      };

      const resize = () => {
        const w = host.clientWidth;
        const h = host.clientHeight;
        renderer.setSize(w, h);
        composer.setSize(w, h);
        bloom.setSize(w / 2, h / 2);
        camera.aspect = w / h;
        camera.fov = camera.aspect < 1 ? 70 : 50;
        camera.updateProjectionMatrix();
        grade.uniforms.uAspect.value = w / h;
      };

      const onPointer = event => {
        if (reducedMotion || event.pointerType === 'touch') return;
        sway.tx = -((event.clientX / window.innerWidth) - 0.5) * 0.05;
        sway.ty = -((event.clientY / window.innerHeight) - 0.5) * 0.03;
      };

      const tick = () => {
        frameId = requestAnimationFrame(tick);
        const now = performance.now();
        const delta = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        if (!visible) return;
        const time = (now - clockStart) / 1000;
        // critically damped glide towards the scroll position
        current += (target - current) * (reducedMotion ? 1 : 1 - Math.exp(-delta * 2.4));
        if (Math.abs(target - current) < 0.0004) current = target;
        const drift = reducedMotion ? 0 : 1;
        sway.x += (sway.tx + Math.sin(time * 0.31) * 0.004 * drift - sway.x) * Math.min(1, delta * 2);
        sway.y += (sway.ty + Math.sin(time * 0.23 + 1.3) * 0.003 * drift - sway.y) * Math.min(1, delta * 2);
        placeCamera(current);
        const positions = dustGeo.attributes.position.array;
        for (let k = 0; k < dustCount; k++) {
          positions[k * 3 + 1] += Math.sin(time * 0.4 + k) * 0.0008;
          positions[k * 3] += Math.cos(time * 0.3 + k * 1.7) * 0.0006;
        }
        dustGeo.attributes.position.needsUpdate = true;
        grade.uniforms.uTime.value = time % 100;
        composer.render();
        const nearest = Math.round(current);
        if (nearest !== lastStop) { lastStop = nearest; setStop(nearest); }
      };

      // ── Click a painting to open it ──
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const pick = event => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(paintingMeshes, false)[0];
        return hit && hit.distance < 14 ? hit.object : null;
      };
      const onMove = event => { onPointer(event); setHovering(Boolean(pick(event))); };
      const onClick = event => {
        const hit = pick(event);
        if (hit) router.push(`/portfolio/${hit.userData.id}`);
      };
      renderer.domElement.addEventListener('pointermove', onMove);
      renderer.domElement.addEventListener('click', onClick);

      const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
      observer.observe(rootRef.current);
      window.addEventListener('scroll', readScroll, { passive: true });
      window.addEventListener('resize', resize);
      resize();
      readScroll();
      current = target;
      tick();
      setStatus('ready');

      cleanup = () => {
        cancelAnimationFrame(frameId);
        observer.disconnect();
        window.removeEventListener('scroll', readScroll);
        window.removeEventListener('resize', resize);
        renderer.domElement.removeEventListener('pointermove', onMove);
        renderer.domElement.removeEventListener('click', onClick);
        disposables.forEach(item => item.dispose?.());
        beamMeshes.forEach(beams => beams.dispose());
        composer.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
    // Slots come from the server render and don't change while mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (hung.length === 0 || status === 'unsupported') return null;

  const currentStop = tourStops[Math.min(stop, stopCount - 1)];
  const activePainting = currentStop.kind === 'painting' ? currentStop.artwork : null;
  const paintingTotal = tourStops.filter(entry => entry.kind === 'painting').length;
  const atEnd = stop >= stopCount - 1;

  function skipToCollection() {
    document.getElementById('portfolio-collection')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <section
      ref={rootRef}
      className="relative bg-[#f3e9ee]"
      style={{ height: `${stopCount * STOP_SCREEN_SHARE}svh` }}
      aria-label="Walk-through gallery of portfolio paintings"
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div ref={hostRef} className="absolute inset-0" style={{ cursor: hovering ? 'pointer' : 'default' }} />

        <div className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-[#f3e9ee] transition-opacity duration-1000 ${status === 'ready' ? 'opacity-0' : 'opacity-100'}`}>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#075f8f]/60">Opening the gallery…</p>
        </div>

        <button
          type="button"
          onClick={skipToCollection}
          className="absolute right-4 top-24 rounded-full bg-white/60 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#075f8f] backdrop-blur transition hover:bg-white sm:right-8 sm:top-32"
        >
          Skip to collection ↓
        </button>

        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4 sm:bottom-10">
          {stop === 0 && status === 'ready' && (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#075f8f]/70">Scroll to walk through the gallery</p>
              <span className="block h-9 w-5 rounded-full border border-[#075f8f]/40 p-1">
                <span className="mx-auto block h-2 w-1 animate-bounce rounded-full bg-[#075f8f]/60" />
              </span>
            </div>
          )}

          {currentStop.kind === 'stairs' && (
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#075f8f]/70">Up to the first floor</p>
          )}

          {activePainting && (
            <div key={activePainting.id} className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-4 rounded-2xl border border-white/60 bg-white/70 px-5 py-4 shadow-[0_12px_40px_rgba(6,58,91,.12)] backdrop-blur-md">
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-[0.28em] text-[#ed7189]">
                  {String(currentStop.number).padStart(2, '0')} / {String(paintingTotal).padStart(2, '0')}
                </p>
                <p className="truncate text-xl text-[#063a5b]" style={{ fontFamily: 'var(--font-cormorant)' }}>{activePainting.title}</p>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/portfolio/${activePainting.id}`)}
                className="shrink-0 rounded-full bg-[#075f8f] px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] text-white transition hover:bg-[#ed7189]"
              >
                View →
              </button>
            </div>
          )}

          {atEnd && (
            <button
              type="button"
              onClick={skipToCollection}
              className="pointer-events-auto rounded-full bg-[#075f8f] px-6 py-3 text-[10px] uppercase tracking-[0.22em] text-white shadow-lg transition hover:bg-[#ed7189]"
            >
              Explore the full collection ↓
            </button>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[#075f8f]/10" aria-hidden="true">
          <div className="h-full bg-[#075f8f]/50" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </section>
  );
}
