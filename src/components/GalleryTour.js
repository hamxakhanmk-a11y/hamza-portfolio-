'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TOUR_SLOTS } from '@/data/galleryTour';

// A white 3D gallery the visitor glides through by scrolling, laid out like the reference film:
// frosted glass doors open onto the entrance hall (arched window at the end, a stair beside it),
// a corridor turns into the great hall (oval skylights, benches, paintings in pairs), the side
// hall leads to a wide flight of stairs, and at the top the route turns into the glass hall.
// Paintings are fixed objects on the walls, so they never move; the camera does the walking.

const EYE = 1.7;
const UPPER = 4.2; // first-floor level
const UPPER_EYE = UPPER + EYE;
const HANG = 2.1; // painting centre height above its floor
const STOP_SCREEN_SHARE = 70; // svh of scrolling per camera stop
const WALL_T = 0.3;

const WALL = 0xf4f2ef;
const FLOOR = 0xeeece8;
const FOG = 0xf3f2f0;

// Where each wall place hangs: position of the canvas centre and the way it faces (rotation about y).
const PLACES = {
  1: { pos: [3.85, HANG, -5.2], yaw: -Math.PI / 2 },
  2: { pos: [3.85, HANG, -7.8], yaw: -Math.PI / 2 },
  3: { pos: [3.85, HANG, -11.5], yaw: -Math.PI / 2 },
  4: { pos: [-3.85, HANG, -4], yaw: Math.PI / 2 },
  5: { pos: [-3.85, HANG, -7], yaw: Math.PI / 2 },
  6: { pos: [-3.85, HANG, -10], yaw: Math.PI / 2 },
  7: { pos: [16.2, HANG, -18.95], yaw: 0 },
  8: { pos: [18.8, HANG, -18.95], yaw: 0 },
  9: { pos: [23.2, HANG, -9.25], yaw: Math.PI },
  10: { pos: [25.8, HANG, -9.25], yaw: Math.PI },
  11: { pos: [30.2, HANG, -18.95], yaw: 0 },
  12: { pos: [32.8, HANG, -18.95], yaw: 0 },
  13: { pos: [37.2, HANG, -9.25], yaw: Math.PI },
  14: { pos: [39.8, HANG, -9.25], yaw: Math.PI },
  15: { pos: [48, HANG, -10.25], yaw: Math.PI },
  16: { pos: [52, HANG, -10.25], yaw: Math.PI },
  17: { pos: [56, HANG, -10.25], yaw: Math.PI },
  18: { pos: [78.25, UPPER + HANG, -22.5], yaw: -Math.PI / 2 },
  19: { pos: [78.25, UPPER + HANG, -30.2], yaw: -Math.PI / 2 },
  20: { pos: [78.25, UPPER + HANG, -32.8], yaw: -Math.PI / 2 },
  21: { pos: [78.25, UPPER + HANG, -41], yaw: -Math.PI / 2 },
};

// The camera's route: a keyframe per line (position, look-at point); `stop` marks where scrolling pauses.
const PATH = [
  { pos: [0, EYE, 5.5], look: [0, 2.2, -8], stop: { kind: 'entrance' } },
  { pos: [0, EYE, -1.5], look: [0, 2.3, -16] },
  { pos: [0.25, EYE, -6.5], look: [4, HANG, -6.5], stop: { bay: [1, 2] } },
  { pos: [0.6, EYE, -11.5], look: [4, HANG - 0.1, -11.5], stop: { bay: [3] } },
  { pos: [2.2, EYE, -6.6], look: [-4, HANG, -7.3], stop: { bay: [4, 5, 6] } },
  { pos: [2.6, EYE, -12.6], look: [6, 1.9, -14.1] },
  { pos: [5.5, EYE, -14.1], look: [14, 1.9, -14.1] },
  { pos: [11.2, EYE, -14.1], look: [28, 2.6, -14.1], stop: { kind: 'view', text: 'The great hall' } },
  { pos: [14, EYE, -14.1], look: [24, HANG, -16] },
  { pos: [17.5, EYE, -15.3], look: [17.5, HANG, -19.1], stop: { bay: [7, 8] } },
  { pos: [21, EYE, -14.1], look: [30, HANG, -12] },
  { pos: [24.5, EYE, -12.9], look: [24.5, HANG, -9.1], stop: { bay: [9, 10] } },
  { pos: [28, EYE, -14.1], look: [36, HANG, -16] },
  { pos: [31.5, EYE, -15.3], look: [31.5, HANG, -19.1], stop: { bay: [11, 12] } },
  { pos: [35, EYE, -14.1], look: [42, HANG, -12.5] },
  { pos: [38.5, EYE, -12.9], look: [38.5, HANG, -9.1], stop: { bay: [13, 14] } },
  { pos: [42, EYE, -14.1], look: [52, 2.0, -14.1] },
  { pos: [45.5, EYE, -15.8], look: [53, HANG, -10.1], stop: { bay: [15, 16, 17] } },
  { pos: [59, EYE, -14.1], look: [70, 4.5, -14.1] },
  { pos: [66.2, 3.8, -14.1], look: [78, 7, -14.1] },
  { pos: [72, UPPER_EYE, -14.1], look: [78.4, 6.8, -14.1], stop: { kind: 'view', text: 'Up to the first floor' } },
  { pos: [74.4, UPPER_EYE, -17], look: [76, 6.2, -30] },
  { pos: [75.6, UPPER_EYE, -21], look: [78.4, UPPER + HANG, -22.5], stop: { bay: [18] } },
  { pos: [74.4, UPPER_EYE, -25.5], look: [75, 6.2, -40] },
  { pos: [74.8, UPPER_EYE, -31.5], look: [78.4, UPPER + HANG, -31.5], stop: { bay: [19, 20] } },
  { pos: [74.4, UPPER_EYE, -36], look: [75, 6.2, -50] },
  { pos: [75.6, UPPER_EYE, -39.5], look: [78.4, UPPER + HANG, -41], stop: { bay: [21] } },
  { pos: [74.4, UPPER_EYE, -44], look: [74.4, 6.6, -50], stop: { kind: 'end' } },
];

function optimizedImage(url) {
  return `/_next/image?url=${encodeURIComponent(url)}&w=1080&q=75`;
}

const smootherstep = t => t * t * t * (t * (t * 6 - 15) + 10);
// Slows down around each stop without ever quite stopping: a dwell, not a halt.
const dwell = t => 0.3 * t + 0.7 * smootherstep(t);
const clamp01 = t => Math.min(1, Math.max(0, t));

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

// The title under a painting, as the film has it.
function labelCanvas(artwork, fontFamily) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#5a5651';
  ctx.font = `500 58px ${fontFamily}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
  let title = String(artwork.title || '').toUpperCase();
  while (title.length > 4 && ctx.measureText(title).width > 980) title = `${title.slice(0, -2)}…`;
  ctx.fillText(title, 512, 24);
  const meta = [artwork.size, artwork.medium].filter(Boolean).join('  ·  ').toUpperCase();
  if (meta) {
    ctx.fillStyle = 'rgba(90,86,81,0.7)';
    ctx.font = `500 30px ${fontFamily}`;
    ctx.fillText(meta, 512, 112);
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
  const hung = slots.filter(entry => entry.artwork && PLACES[entry.slot]);
  const bySlot = new Map(hung.map(entry => [entry.slot, entry.artwork]));
  const numberOf = new Map(hung.map((entry, i) => [entry.slot, i + 1]));
  // the stops along the route; a bay with no paintings hung is skipped
  const tourStops = PATH.filter(key => key.stop).map(key => key.stop).map(marker => (
    marker.bay ? { kind: 'bay', paintings: marker.bay.filter(id => bySlot.has(id)).map(id => ({ slot: id, number: numberOf.get(id), artwork: bySlot.get(id) })) } : marker
  )).filter(marker => marker.kind !== 'bay' || marker.paintings.length);
  const stopCount = tourStops.length;

  useEffect(() => {
    if (hung.length === 0) return undefined;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const [THREE, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { RoomEnvironment }] = await Promise.all([
        import('three'),
        import('three/addons/postprocessing/EffectComposer.js'),
        import('three/addons/postprocessing/RenderPass.js'),
        import('three/addons/postprocessing/UnrealBloomPass.js'),
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
      renderer.toneMappingExposure = 1.0;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      host.appendChild(renderer.domElement);
      renderer.domElement.style.display = 'block';

      const disposables = [];
      const keep = item => { disposables.push(item); return item; };
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(FOG);
      scene.fog = new THREE.Fog(FOG, 30, 110);
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = keep(pmrem.fromScene(new RoomEnvironment(), 0.04).texture);
      scene.environmentIntensity = 0.4;
      pmrem.dispose();

      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 160);
      const fontFamily = cssFont('--font-cormorant', 'Georgia, serif');
      await (document.fonts?.ready || Promise.resolve());
      const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
      const canvasTexture = canvas => {
        const texture = keep(new THREE.CanvasTexture(canvas));
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = maxAnisotropy;
        return texture;
      };

      // ── Materials: smooth, matte, off-white ──
      const wallMat = keep(new THREE.MeshStandardMaterial({ color: WALL, roughness: 1 }));
      const floorMat = keep(new THREE.MeshStandardMaterial({ color: FLOOR, roughness: 0.45 }));
      const stepMat = keep(new THREE.MeshStandardMaterial({ color: 0xe8e5e1, roughness: 0.9 }));
      const frameMat = keep(new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.5, metalness: 0.4 }));
      const glassMat = keep(new THREE.MeshStandardMaterial({ color: 0xf2f5f7, roughness: 0.2, transparent: true, opacity: 0.55 }));
      const skyMat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, toneMapped: false }));
      const lampMat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
      const canvasEdgeMat = keep(new THREE.MeshStandardMaterial({ color: 0xf2f0ec, roughness: 0.9 }));

      const add = (geometry, material, position, options = {}) => {
        const mesh = new THREE.Mesh(keep(geometry), material);
        mesh.position.set(...position);
        if (options.rotation) mesh.rotation.set(...options.rotation);
        mesh.castShadow = options.cast ?? true;
        mesh.receiveShadow = options.receive ?? true;
        scene.add(mesh);
        return mesh;
      };
      // a solid box from its extents
      const block = (x0, x1, y0, y1, z0, z1, material = wallMat, options) =>
        add(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), material, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], options);
      // a wall along x or z with a rectangular opening in it
      const wallX = (x, z0, z1, y0, y1, hole) => { // wall in the plane x = const, running along z
        if (!hole) return block(x - WALL_T / 2, x + WALL_T / 2, y0, y1, z0, z1);
        const [h0, h1, hTop] = hole; // z range of the opening, and its height above y0
        block(x - WALL_T / 2, x + WALL_T / 2, y0, y1, z0, Math.max(h0, h1));
        block(x - WALL_T / 2, x + WALL_T / 2, y0, y1, Math.min(h0, h1), z1);
        block(x - WALL_T / 2, x + WALL_T / 2, y0 + hTop, y1, Math.min(h0, h1), Math.max(h0, h1));
      };
      const wallZ = (z, x0, x1, y0, y1, hole) => { // wall in the plane z = const, running along x
        if (!hole) return block(x0, x1, y0, y1, z - WALL_T / 2, z + WALL_T / 2);
        const [h0, h1, hTop] = hole;
        block(x0, h0, y0, y1, z - WALL_T / 2, z + WALL_T / 2);
        block(h1, x1, y0, y1, z - WALL_T / 2, z + WALL_T / 2);
        block(h0, h1, y0 + hTop, y1, z - WALL_T / 2, z + WALL_T / 2);
      };
      const floor = (x0, x1, z0, z1, y = 0) =>
        add(new THREE.PlaneGeometry(x1 - x0, Math.abs(z1 - z0)), floorMat, [(x0 + x1) / 2, y, (z0 + z1) / 2], { rotation: [-Math.PI / 2, 0, 0], cast: false });
      // a ceiling slab with skylight holes ("rect" strips or "oval" openings), bright sky above
      const ceiling = (x0, x1, z0, z1, y, holes = []) => {
        const shape = new THREE.Shape();
        shape.moveTo(x0, z0); shape.lineTo(x1, z0); shape.lineTo(x1, z1); shape.lineTo(x0, z1); shape.lineTo(x0, z0);
        for (const hole of holes) {
          const path = new THREE.Path();
          if (hole.oval) path.absellipse(hole.oval[0], hole.oval[1], hole.oval[2], hole.oval[3], 0, Math.PI * 2, false, 0);
          else { const [a0, a1, b0, b1] = hole.rect; path.moveTo(a0, b0); path.lineTo(a1, b0); path.lineTo(a1, b1); path.lineTo(a0, b1); path.lineTo(a0, b0); }
          shape.holes.push(path);
        }
        // the shape's y runs along world z; rotating it flat drops the extrusion below y
        const slab = add(new THREE.ExtrudeGeometry(shape, { depth: 0.45, bevelEnabled: false, curveSegments: 48 }), wallMat, [0, y + 0.45, 0], { rotation: [Math.PI / 2, 0, 0] });
        slab.receiveShadow = false;
        add(new THREE.PlaneGeometry(x1 - x0 + 4, Math.abs(z1 - z0) + 4), skyMat, [(x0 + x1) / 2, y + 2.2, (z0 + z1) / 2], { rotation: [Math.PI / 2, 0, 0], cast: false, receive: false });
      };
      const archedWindowWall = (x0, x1, y0, height, z, radius, sill, spring) => {
        const w = x1 - x0;
        const shape = new THREE.Shape();
        shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(w / 2, height); shape.lineTo(-w / 2, height); shape.lineTo(-w / 2, 0);
        const hole = new THREE.Path();
        hole.moveTo(-radius, sill); hole.lineTo(-radius, spring); hole.absarc(0, spring, radius, Math.PI, 0, true); hole.lineTo(radius, sill); hole.lineTo(-radius, sill);
        shape.holes.push(hole);
        add(new THREE.ExtrudeGeometry(shape, { depth: WALL_T, bevelEnabled: false, curveSegments: 40 }), wallMat, [(x0 + x1) / 2, y0, z - WALL_T / 2]);
        add(new THREE.PlaneGeometry(w + 6, height + 6), skyMat, [(x0 + x1) / 2, y0 + height / 2, z - 3], { cast: false, receive: false });
        for (let k = -1; k <= 1; k++) block((x0 + x1) / 2 + k * radius * 0.5 - 0.025, (x0 + x1) / 2 + k * radius * 0.5 + 0.025, y0 + sill, y0 + spring + radius * (k ? 0.86 : 1), z + 0.1, z + 0.15, frameMat, { cast: false });
        for (const y of [spring - (spring - sill) * 0.35, spring + (spring - sill) * 0.2]) block((x0 + x1) / 2 - radius, (x0 + x1) / 2 + radius, y0 + y - 0.025, y0 + y + 0.025, z + 0.1, z + 0.15, frameMat, { cast: false });
      };
      // a glass wall: bright glazing behind piers and a slim mullion grid
      const glazing = (axis, at, a0, a1, y0, y1, outward = 1) => { // outward: which side of the wall is outside
        const len = Math.abs(a1 - a0), mid = (a0 + a1) / 2, h = y1 - y0;
        if (axis === 'x') {
          add(new THREE.PlaneGeometry(len, h), skyMat, [at + 0.35 * outward, (y0 + y1) / 2, mid], { rotation: [0, outward > 0 ? -Math.PI / 2 : Math.PI / 2, 0], cast: false, receive: false });
          for (let z = Math.max(a0, a1); z >= Math.min(a0, a1); z -= 4) block(at - 0.2, at + 0.2, y0, y1, z - 0.2, z + 0.2);
          for (let z = Math.max(a0, a1) - 2; z > Math.min(a0, a1); z -= 4) block(at - 0.04, at + 0.04, y0, y1, z - 0.04, z + 0.04, frameMat, { cast: false });
          for (let y = y0 + 2.2; y < y1 - 0.4; y += 2.2) block(at - 0.04, at + 0.04, y - 0.04, y + 0.04, Math.min(a0, a1), Math.max(a0, a1), frameMat, { cast: false });
        } else {
          add(new THREE.PlaneGeometry(len, h), skyMat, [mid, (y0 + y1) / 2, at - 0.35], { cast: false, receive: false });
          for (let x = a0; x <= a1; x += 4) block(x - 0.2, x + 0.2, y0, y1, at - 0.2, at + 0.2);
          for (let x = a0 + 2; x < a1; x += 4) block(x - 0.04, x + 0.04, y0, y1, at - 0.04, at + 0.04, frameMat, { cast: false });
          for (let y = y0 + 2.2; y < y1 - 0.4; y += 2.2) block(a0, a1, y - 0.04, y + 0.04, at - 0.04, at + 0.04, frameMat, { cast: false });
        }
      };

      // ── Entrance hall: x -4..4, z 0..-16, 6 high ──
      floor(-4, 4, 9, -16);
      wallX(-4, 0, -16, 0, 6);
      wallX(4, 0, -16, 0, 6, [-13, -15.2, 3.2]); // doorway to the corridor
      ceiling(-4, 4, 0, -16, 6, [{ rect: [-0.9, 0.9, -2, -14] }]);
      archedWindowWall(-4, 4, 0, 6, -16, 1.6, 1.0, 3.4);
      // frosted glass front with sliding doors
      block(-4, 4, 3.4, 6, -0.03, 0.03, glassMat, { cast: false });
      block(-4, -2.2, 0, 3.4, -0.03, 0.03, glassMat, { cast: false });
      block(2.2, 4, 0, 3.4, -0.03, 0.03, glassMat, { cast: false });
      for (const x of [-4, -2.2, 2.2, 4]) block(x - 0.04, x + 0.04, 0, 6, -0.06, 0.06, frameMat, { cast: false });
      block(-4, 4, 3.36, 3.44, -0.06, 0.06, frameMat, { cast: false });
      const doors = [-1, 1].map(side => {
        const door = new THREE.Group();
        const pane = new THREE.Mesh(keep(new THREE.BoxGeometry(2.2, 3.4, 0.05)), glassMat);
        pane.position.set(side * 1.1, 1.7, 0);
        const bar = new THREE.Mesh(keep(new THREE.BoxGeometry(0.06, 3.4, 0.1)), frameMat);
        bar.position.set(side * 0.03, 1.7, 0);
        const handle = new THREE.Mesh(keep(new THREE.BoxGeometry(0.04, 1.1, 0.14)), frameMat);
        handle.position.set(side * 0.22, 1.25, 0.08);
        door.add(pane, bar, handle);
        scene.add(door);
        return { door, side };
      });
      // a short stair against the far left corner, as in the film, with a slim rail
      for (let k = 0; k < 10; k++) {
        const h = 0.19 * (k + 1);
        block(-3.85, -1.9, 0, h, -11 - 0.4 * k - 0.4, -11 - 0.4 * k, stepMat);
      }
      block(-1.95, -1.9, 0.9, 1.0, -11.2, -15.2, frameMat, { cast: false });
      for (const z of [-11.3, -13.2, -15.1]) block(-1.95, -1.9, 0, 1.0, z - 0.025, z + 0.025, frameMat, { cast: false });
      block(-1.2, 1.2, 0, 0.42, -13.2, -14.4, stepMat); // bench

      // ── Corridor: x 4..10, z -13..-15.2, 3.2 high ──
      floor(4, 10, -13, -15.2);
      wallZ(-13, 4, 10, 0, 3.2);
      wallZ(-15.2, 4, 10, 0, 3.2);
      block(4, 10, 3.2, 3.6, -13, -15.2);

      // ── Great hall: x 10..44, z -9.1..-19.1, 7 high, oval skylights, benches down the middle ──
      floor(10, 44, -9.1, -19.1);
      wallX(10, -9.1, -19.1, 0, 7, [-13, -15.2, 3.2]);
      wallX(44, -9.1, -19.1, 0, 7, [-12.6, -15.6, 4.2]);
      wallZ(-9.1, 10, 44, 0, 7);
      wallZ(-19.1, 10, 44, 0, 7);
      ceiling(10, 44, -9.1, -19.1, 7, [17, 25, 33, 41].map(x => ({ oval: [x, -14.1, 1.9, 1.15] })));
      for (const [x, z, w, d] of [[20, -14.1, 1.4, 1.4], [21.5, -13.1, 1.4, 1.0], [21.5, -15.1, 1.4, 1.0], [22.9, -14.1, 1.4, 1.4], [34, -14.1, 1.4, 1.4], [35.5, -13.3, 1.4, 1.0], [35.5, -14.9, 1.4, 1.0]]) {
        block(x - w / 2, x + w / 2, 0, 0.45, z - d / 2, z + d / 2, stepMat);
      }

      // ── Side hall: x 44..62, z -10.1..-18.1, 7 high; then the stair hall rising to the first floor ──
      floor(44, 62, -10.1, -18.1);
      wallZ(-10.1, 44, 62, 0, 7);
      wallZ(-18.1, 44, 62, 0, 7);
      ceiling(44, 62, -10.1, -18.1, 7);
      for (const x of [47, 51, 55, 59]) block(x - 0.9, x + 0.9, 6.9, 6.96, -11.6, -11.3, lampMat, { cast: false, receive: false });
      // stair hall and landing share a taller volume
      const TOP = UPPER + 6;
      wallZ(-10.1, 62, 78.4, 0, TOP);
      wallZ(-18.1, 62, 70.4, 0, TOP);
      block(44, 62, 7, TOP, -18.1, -10.1); // above the side hall's ceiling, closing the tall volume
      ceiling(62, 78.4, -10.1, -18.1, TOP, [{ rect: [63, 77.4, -13.2, -15] }]);
      const steps = 21, rise = UPPER / steps, run = 0.4;
      for (let k = 0; k < steps; k++) {
        const h = rise * (k + 1), x = 62 + run * k;
        block(x, x + run, 0, h, -18.1, -10.1, floorMat);
        add(new THREE.PlaneGeometry(8, rise - 0.02), stepMat, [x - 0.005, h - rise / 2, -14.1], { rotation: [0, -Math.PI / 2, 0], cast: false });
      }
      // tall window facing the top of the stairs
      glazing('x', 78.4, -10.1, -18.1, UPPER, TOP);

      // ── Glass hall (first floor): x 70.4..78.4, z -18.1..-50, glass on the left, paintings on the right ──
      block(70.4, 78.4, UPPER - 0.4, UPPER, -50, -10.1, floorMat);
      wallX(78.4, -18.1, -50, UPPER, TOP);
      glazing('x', 70.4, -18.1, -50, UPPER, TOP, -1);
      ceiling(70.4, 78.4, -18.1, -50, TOP, [{ rect: [73.2, 75.6, -20, -48] }]);
      archedWindowWall(70.4, 78.4, UPPER, 6, -50, 1.6, 0.6, 3.6);

      // ── Light: soft white daylight from above, no colour cast ──
      scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d7d3, 1.0));
      const sun = new THREE.DirectionalLight(0xffffff, 1.7);
      const sunDirection = new THREE.Vector3(0.22, 1, 0.14).normalize();
      sun.castShadow = true;
      sun.shadow.mapSize.set(narrow ? 1024 : 2048, narrow ? 1024 : 2048);
      Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 80 });
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 0.04;
      sun.shadow.radius = 4;
      scene.add(sun, sun.target);

      const dustCount = narrow ? 120 : 300;
      const dustPositions = new Float32Array(dustCount * 3);
      for (let k = 0; k < dustCount; k++) {
        dustPositions[k * 3] = (Math.random() - 0.5) * 8;
        dustPositions[k * 3 + 1] = 0.4 + Math.random() * 5.5;
        dustPositions[k * 3 + 2] = (Math.random() - 0.5) * 16;
      }
      const dustGeo = keep(new THREE.BufferGeometry());
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
      const dust = new THREE.Points(dustGeo, keep(new THREE.PointsMaterial({ size: 0.03, map: canvasTexture(dotCanvas()), transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending })));
      scene.add(dust);

      // ── Paintings: plain canvases, shown exactly as their photographs ──
      const loader = new THREE.TextureLoader();
      const paintingMeshes = [];
      await Promise.all(hung.map(async ({ slot, artwork }) => {
        const place = PLACES[slot];
        const group = new THREE.Group();
        group.position.set(...place.pos);
        group.rotation.y = place.yaw;
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
        let height = 1.75, width = height * aspect;
        if (width > 2.2) { width = 2.2; height = width / aspect; }
        const cutOut = artwork.round || hasTransparentCorners(image);
        const faceMat = keep(new THREE.MeshBasicMaterial({ map: texture, transparent: cutOut, alphaTest: cutOut ? 0.04 : 0, toneMapped: false }));
        const art = cutOut
          ? new THREE.Mesh(keep(artwork.round ? new THREE.CircleGeometry(height / 2, 72) : new THREE.PlaneGeometry(width, height)), faceMat)
          : new THREE.Mesh(keep(new THREE.BoxGeometry(width, height, 0.04)), [canvasEdgeMat, canvasEdgeMat, canvasEdgeMat, canvasEdgeMat, faceMat, canvasEdgeMat]);
        art.position.z = cutOut ? 0.02 : 0.02 + 0.02;
        art.castShadow = true;
        if (cutOut) art.customDepthMaterial = keep(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: texture, alphaTest: 0.5 }));
        art.userData = { id: artwork.id };
        group.add(art);
        paintingMeshes.push(art);
        const label = new THREE.Mesh(keep(new THREE.PlaneGeometry(2.0, 0.5)), keep(new THREE.MeshBasicMaterial({ map: canvasTexture(labelCanvas(artwork, fontFamily)), transparent: true, depthWrite: false, toneMapped: false })));
        label.position.set(0, -height / 2 - 0.42, 0.012);
        group.add(label);
      }));
      if (disposed) return;

      // ── Camera path ──
      const V = v => new THREE.Vector3(...v);
      const positionCurve = new THREE.CatmullRomCurve3(PATH.map(k => V(k.pos)), false, 'centripetal');
      const targetCurve = new THREE.CatmullRomCurve3(PATH.map(k => V(k.look)), false, 'centripetal');
      const segments = PATH.length - 1;
      // keyframe index of each stop, skipping bays with nothing hung (they fall out of tourStops too)
      const stopKeys = PATH.map((key, i) => (key.stop ? i : -1)).filter((i, k) => {
        if (i < 0) return false;
        const marker = PATH[i].stop;
        return !marker.bay || marker.bay.some(id => bySlot.has(id)) || k === 0;
      });
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
        camera.rotateY(sway.x);
        camera.rotateX(sway.y);
        // the doors slide apart as the visitor comes in
        const open = smootherstep(clamp01((s - 0.02) / 0.3));
        for (const { door, side } of doors) door.position.x = side * 2.15 * open;
        // keep the light's shadow map and the dust around what the camera sees
        const floorY = camera.position.y > UPPER ? UPPER : 0;
        sun.target.position.set(camera.position.x, floorY, camera.position.z);
        sun.position.copy(sun.target.position).addScaledVector(sunDirection, 35);
        dust.position.set(camera.position.x, floorY, camera.position.z);
      };

      // ── Post-processing: a touch of glow on the windows, nothing else ──
      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), narrow ? 0.1 : 0.14, 0.5, 0.92);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());

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
        camera.fov = camera.aspect < 1 ? 64 : 46;
        camera.updateProjectionMatrix();
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
  const bay = currentStop.kind === 'bay' ? currentStop.paintings : [];
  const atEnd = stop >= stopCount - 1;

  function skipToCollection() {
    document.getElementById('portfolio-collection')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <section
      ref={rootRef}
      className="relative bg-[#f3f2f0]"
      style={{ height: `${stopCount * STOP_SCREEN_SHARE}svh` }}
      aria-label="Walk-through gallery of portfolio paintings"
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div ref={hostRef} className="absolute inset-0" style={{ cursor: hovering ? 'pointer' : 'default' }} />

        {/* Title card over the doors, as the film opens */}
        <div className={`pointer-events-none absolute inset-x-0 top-[22%] flex flex-col items-center text-center transition-opacity duration-700 ${status === 'ready' && progress < 0.012 ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-4xl font-light tracking-[0.2em] text-[#4a4a48] sm:text-6xl" style={{ fontFamily: 'var(--font-cormorant)' }}>{artistName.toUpperCase()}</p>
          <p className="mt-3 text-[11px] uppercase tracking-[0.45em] text-[#ed7189]">Portfolio</p>
        </div>

        <div className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-[#f3f2f0] transition-opacity duration-1000 ${status === 'ready' ? 'opacity-0' : 'opacity-100'}`}>
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
          {currentStop.kind === 'entrance' && status === 'ready' && (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#075f8f]/70">Scroll to walk through the gallery</p>
              <span className="block h-9 w-5 rounded-full border border-[#075f8f]/40 p-1">
                <span className="mx-auto block h-2 w-1 animate-bounce rounded-full bg-[#075f8f]/60" />
              </span>
            </div>
          )}

          {currentStop.kind === 'view' && (
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#075f8f]/70">{currentStop.text}</p>
          )}

          {bay.length > 0 && (
            <div key={bay[0].slot} className="pointer-events-auto flex w-full max-w-2xl flex-wrap justify-center gap-2">
              {bay.map(({ slot, number, artwork }) => (
                <div key={slot} className="flex min-w-0 flex-1 basis-56 items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-[0_12px_40px_rgba(6,58,91,.12)] backdrop-blur-md">
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-[0.28em] text-[#ed7189]">
                      {String(number).padStart(2, '0')} / {String(hung.length).padStart(2, '0')}
                    </p>
                    <p className="truncate text-lg text-[#063a5b]" style={{ fontFamily: 'var(--font-cormorant)' }}>{artwork.title}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(`/portfolio/${artwork.id}`)}
                    className="shrink-0 rounded-full bg-[#075f8f] px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] text-white transition hover:bg-[#ed7189]"
                  >
                    View →
                  </button>
                </div>
              ))}
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
