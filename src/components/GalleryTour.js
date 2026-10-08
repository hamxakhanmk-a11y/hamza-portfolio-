'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TOUR_SLOTS } from '@/data/galleryTour';
import { gallerySkyVertex, gallerySkyFragment } from '@/data/gallerySky';
import { getRestoredArtworkImage } from '@/data/artworkImageRestoration';

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

// Bright off-white throughout; stable contact shadows define the architecture.
const WALL = 0xfffff8;
const FLOOR = 0xfafaf3;
const FOG = 0xfffff8;

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

function hasTransparentCorners(image) {
  const size = 24;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  return [[1, 1], [size - 2, 1], [1, size - 2], [size - 2, size - 2]].every(([x, y]) => data[(y * size + x) * 4 + 3] < 40);
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
      const [THREE, { RoomEnvironment }] = await Promise.all([
        import('three'),
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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, narrow ? 1.5 : 2)); // finer sampling keeps thin edges steady while moving
      // no filmic tone curve: it drags a lit white wall down to grey; colours render as painted
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      // The building and sun are fixed: bake this map once, not on every camera frame.
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;
      host.appendChild(renderer.domElement);
      renderer.domElement.style.display = 'block';

      const disposables = [];
      const keep = item => { disposables.push(item); return item; };
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(FOG);
      scene.fog = new THREE.Fog(FOG, 30, 110);
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = keep(pmrem.fromScene(new RoomEnvironment(), 0.04).texture);
      scene.environmentIntensity = 0.2;
      pmrem.dispose();

      const camera = new THREE.PerspectiveCamera(50, 1, 0.3, 300);
      await (document.fonts?.ready || Promise.resolve());
      const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
      const canvasTexture = canvas => {
        const texture = keep(new THREE.CanvasTexture(canvas));
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = maxAnisotropy;
        return texture;
      };

      // ── Materials: smooth, matte, off-white ──
      // A bright base keeps shaded plaster white; a small diffuse term adds daylight relief.
      const brightSurface = (color) => {
        const material = keep(new THREE.MeshLambertMaterial({ color: 0x242424, emissive: color, emissiveIntensity: 0.94, toneMapped: false }));
        material.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <shadowmap_pars_fragment>', '#include <shadowmap_pars_fragment>\n#include <shadowmask_pars_fragment>')
            .replace('#include <opaque_fragment>', 'outgoingLight *= mix(0.84, 1.0, getShadowMask());\n#include <opaque_fragment>');
        };
        material.customProgramCacheKey = () => 'bright-gallery-daylight-v1';
        return material;
      };
      const wallMat = brightSurface(WALL);
      const floorMat = brightSurface(FLOOR);
      const ceilingMat = brightSurface(WALL);
      const stepMat = brightSurface(0xf7f7f0);
      const columnMat = wallMat;
      const artworkEdgeMat = keep(new THREE.MeshStandardMaterial({ color: 0xf3d68b, metalness: 0.35, roughness: 0.4, toneMapped: false }));
      const frameMat = keep(new THREE.MeshBasicMaterial({ color: 0xcfcbc4, toneMapped: false }));
      const glassMat = keep(new THREE.MeshBasicMaterial({ color: WALL, transparent: true, opacity: 0.35, toneMapped: false }));
      // Soft cloud density drifts independently of the visitor's camera.
      const skyMat = keep(new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: gallerySkyVertex,
        fragmentShader: gallerySkyFragment,
        fog: false,
        toneMapped: false,
        side: THREE.BackSide,
        depthWrite: false,
      }));
      const lampMat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
      const canvasEdgeMat = keep(new THREE.MeshBasicMaterial({ color: 0xf2ece2, toneMapped: false }));

      const add = (geometry, material, position, options = {}) => {
        const mesh = new THREE.Mesh(keep(geometry), material);
        mesh.position.set(...position);
        if (options.rotation) mesh.rotation.set(...options.rotation);
        mesh.castShadow = options.cast ?? true;
        mesh.receiveShadow = options.receive ?? true;
        scene.add(mesh);
        return mesh;
      };
      add(new THREE.SphereGeometry(120, 48, 24), skyMat, [37, 0, -20], { cast: false, receive: false });
      // a solid box from its extents
      // corners may come in either order: a negative size would build the box inside-out
      const block = (x0, x1, y0, y1, z0, z1, material = wallMat, options) =>
        add(new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)), material, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], options);
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
      // Wide open roof bays and slim cross-beams, like the reference gallery.
      const ceiling = (x0, x1, z0, z1, y) => {
        const lowZ = Math.min(z0, z1), highZ = Math.max(z0, z1);
        const rim = 0.55;
        const holes = [{ rect: [x0 + rim, x1 - rim, lowZ + rim, highZ - rim] }];
        const shape = new THREE.Shape();
        shape.moveTo(x0, z0); shape.lineTo(x1, z0); shape.lineTo(x1, z1); shape.lineTo(x0, z1); shape.lineTo(x0, z0);
        for (const hole of holes) {
          const path = new THREE.Path();
          if (hole.oval) path.absellipse(hole.oval[0], hole.oval[1], hole.oval[2], hole.oval[3], 0, Math.PI * 2, false, 0);
          else { const [a0, a1, b0, b1] = hole.rect; path.moveTo(a0, b0); path.lineTo(a1, b0); path.lineTo(a1, b1); path.lineTo(a0, b1); path.lineTo(a0, b0); }
          shape.holes.push(path);
        }
        // the shape's y runs along world z; rotating it flat drops the extrusion below y
        const slab = add(new THREE.ExtrudeGeometry(shape, { depth: 0.45, bevelEnabled: false, curveSegments: 48 }), ceilingMat, [0, y + 0.45, 0], { rotation: [Math.PI / 2, 0, 0] });
        slab.receiveShadow = false;
        if (x1 - x0 > Math.abs(z1 - z0)) {
          for (let x = x0 + 3.5; x < x1 - rim; x += 3.5) {
            block(x - 0.13, x + 0.13, y, y + 0.35, lowZ + rim, highZ - rim, ceilingMat);
          }
        } else {
          for (let z = lowZ + 3.5; z < highZ - rim; z += 3.5) {
            block(x0 + rim, x1 - rim, y, y + 0.35, z - 0.13, z + 0.13, ceilingMat);
          }
        }
        // open to the sky: nothing in the hole but the blue above it
      };
      const archedWindowWall = (x0, x1, y0, height, z, radius, sill, spring) => {
        const w = x1 - x0;
        const shape = new THREE.Shape();
        shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(w / 2, height); shape.lineTo(-w / 2, height); shape.lineTo(-w / 2, 0);
        const hole = new THREE.Path();
        hole.moveTo(-radius, sill); hole.lineTo(-radius, spring); hole.absarc(0, spring, radius, Math.PI, 0, true); hole.lineTo(radius, sill); hole.lineTo(-radius, sill);
        shape.holes.push(hole);
        add(new THREE.ExtrudeGeometry(shape, { depth: WALL_T, bevelEnabled: false, curveSegments: 40 }), wallMat, [(x0 + x1) / 2, y0, z - WALL_T / 2]);
        // the window is an open arch onto the sky: no glass and no bars
      };
      // an open wall onto the sky: slim piers every 4 m and nothing between them, no glass, no bars
      const glazing = (axis, at, a0, a1, y0, y1) => {
        const h = y1 - y0;
        if (axis === 'x') {
          const start = Math.min(a0, a1), end = Math.max(a0, a1);
          const columns = end - start <= 8.1 ? [start, end] : Array.from({ length: Math.floor((end - start) / 4) + 1 }, (_, i) => start + i * 4);
          for (const z of columns) {
            add(new THREE.CylinderGeometry(0.23, 0.26, h, 48), columnMat, [at, (y0 + y1) / 2, z]);
            block(at - 0.32, at + 0.32, y0, y0 + 0.16, z - 0.32, z + 0.32);
            block(at - 0.3, at + 0.3, y1 - 0.16, y1, z - 0.3, z + 0.3);
          }
        } else {
          for (let x = a0; x <= a1; x += 4) block(x - 0.2, x + 0.2, y0, y1, at - 0.2, at + 0.2);
        }
      };

      // ── Entrance hall: x -4..4, z 0..-16, 6 high ──
      floor(-4, 4, 9, -16);
      // Full-height entrance returns hide the exposed ends of the interior walls.
      wallX(-4, 9, 0, 0, 6);
      wallX(4, 9, 0, 0, 6);
      wallX(-4, 0, -16, 0, 6);
      wallX(4, 0, -16, 0, 6, [-13, -15.2, 3.2]); // doorway to the corridor
      ceiling(-4, 4, 0, -16, 6);
      archedWindowWall(-4, 4, 0, 6, -16, 1.6, 1.0, 3.4);
      // frosted glass front with sliding doors
      block(-4, 4, 3.4, 6, -0.03, 0.03, glassMat, { cast: false });
      block(-4, -2.2, 0, 3.4, -0.03, 0.03, glassMat, { cast: false });
      block(2.2, 4, 0, 3.4, -0.03, 0.03, glassMat, { cast: false });
      for (const x of [-4, -2.2, 2.2, 4]) block(x - 0.07, x + 0.07, 0, 6, -0.07, 0.07, frameMat, { cast: false });
      block(-4, 4, 3.33, 3.47, -0.07, 0.07, frameMat, { cast: false });
      const doors = [-1, 1].map(side => {
        const door = new THREE.Group();
        const pane = new THREE.Mesh(keep(new THREE.BoxGeometry(2.2, 3.4, 0.05)), glassMat);
        pane.position.set(side * 1.1, 1.7, 0);
        const bar = new THREE.Mesh(keep(new THREE.BoxGeometry(0.1, 3.4, 0.12)), frameMat);
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
      block(-1.98, -1.88, 0.9, 1.0, -11.2, -15.2, frameMat, { cast: false });
      for (const z of [-11.3, -13.2, -15.1]) block(-1.98, -1.88, 0, 1.0, z - 0.05, z + 0.05, frameMat, { cast: false });
      block(-1.2, 1.2, 0, 0.42, -13.2, -14.4, stepMat); // bench

      // ── Corridor: x 4..10, z -13..-15.2, 3.2 high ──
      floor(4, 10, -13, -15.2);
      wallZ(-13, 4.15, 9.85, 0, 3.2);
      wallZ(-15.2, 4.15, 9.85, 0, 3.2);
      ceiling(4.15, 9.85, -13, -15.2, 3.2);

      // ── Great hall: x 10..44, z -9.1..-19.1, 7 high, oval skylights, benches down the middle ──
      floor(10, 44, -9.1, -19.1);
      wallX(10, -9.1, -19.1, 0, 7, [-13, -15.2, 3.2]);
      wallX(44, -9.1, -19.1, 0, 7, [-12.6, -15.6, 4.2]);
      wallZ(-9.1, 10, 44, 0, 7);
      wallZ(-19.1, 10, 44, 0, 7);
      ceiling(10, 44, -9.1, -19.1, 7);
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
      ceiling(62, 78.4, -10.1, -18.1, TOP);
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
      ceiling(70.4, 78.4, -18.1, -50, TOP);
      archedWindowWall(70.4, 78.4, UPPER, 6, -50, 1.6, 0.6, 3.6);

      // ── Light: soft, even white daylight, no colour cast ──
      // bright, even light so the walls read as off-white, with a weak sun for soft shading
      scene.add(new THREE.AmbientLight(0xffffff, 0.76));
      scene.add(new THREE.HemisphereLight(0xe9f4ff, 0xe6e6df, 0.16));
      const sun = new THREE.DirectionalLight(0xfffcf5, 0.65);
      sun.position.set(-5, 35, -35);
      sun.target.position.set(37, 0, -20);
      sun.castShadow = true;
      sun.shadow.mapSize.set(narrow ? 2048 : 4096, narrow ? 2048 : 4096);
      Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 50, bottom: -50, near: 0.5, far: 150 });
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 0.08;
      scene.add(sun.target);
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0xeaf4ff, 0.1);
      fill.position.set(-8, 12, -10);
      scene.add(fill);

      // painted shadows: soft dark gradients that sit still on the wall or floor
      const shadowTexture = (w, h, blur) => {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.filter = `blur(${blur}px)`;
        ctx.fillStyle = 'rgba(0,0,0,1)';
        const px = 128 * (1 - w), py = 128 * (1 - h);
        ctx.fillRect(px, py, 256 - 2 * px, 256 - 2 * py);
        return canvasTexture(canvas);
      };
      const wallShadowTex = shadowTexture(0.62, 0.62, 22);
      const floorShadowTex = shadowTexture(0.6, 0.6, 26);
      const paintedShadow = (texture, width, height, position, rotation, opacity) => {
        const mesh = add(new THREE.PlaneGeometry(width, height), keep(new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity, depthWrite: false })), position, { rotation, cast: false, receive: false });
        return mesh;
      };
      // a soft dark band fading out from one edge (for corners and the line under a ceiling)
      const edgeTexture = (r, g, b, a0) => {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 8;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 256, 0);
        grad.addColorStop(0, `rgba(${r},${g},${b},${a0})`);
        grad.addColorStop(0.45, `rgba(${r},${g},${b},${a0 * 0.3})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 8);
        return canvasTexture(canvas);
      };
      const bandMat = keep(new THREE.MeshBasicMaterial({ map: edgeTexture(48, 55, 64, 0.12), transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
      // warm sunlight spilling in beside a window, additive so it lightens rather than tints
      const spillMat = keep(new THREE.MeshBasicMaterial({ map: edgeTexture(235, 244, 255, 0.12), transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
      // strip: a plane whose dark/bright edge lies along the line a->b, fading out across the surface.
      // normal is the surface's outward direction; across is the in-surface direction to fade along.
      const strip = (material, a, b, across, normal, reach) => {
        if (reach <= 0) return null;
        const ax = new THREE.Vector3(...a), bx = new THREE.Vector3(...b);
        const along = bx.clone().sub(ax); const len = along.length(); along.normalize();
        const acrossV = new THREE.Vector3(...across).normalize();
        const centre = ax.clone().add(bx).multiplyScalar(0.5).addScaledVector(acrossV, reach / 2).addScaledVector(new THREE.Vector3(...normal), 0.012);
        const mesh = new THREE.Mesh(keep(new THREE.PlaneGeometry(reach, len)), material);
        // plane's local +x = across (texture u runs from the edge outward), local +y = along
        mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(acrossV, along, acrossV.clone().cross(along)));
        mesh.position.copy(centre);
        mesh.renderOrder = 1;
        scene.add(mesh);
        return mesh;
      };
      const X = [1, 0, 0], NX = [-1, 0, 0], Y = [0, 1, 0], NY = [0, -1, 0], Z = [0, 0, 1], NZ = [0, 0, -1];
      // Floor contact and doorway recesses, in addition to the wall corner shading.
      strip(bandMat, [-3.82, 0.025, 0], [-3.82, 0.025, -16], X, Y, 0.65);
      strip(bandMat, [3.82, 0.025, 0], [3.82, 0.025, -16], NX, Y, 0.65);
      strip(bandMat, [10, 0.025, -9.28], [44, 0.025, -9.28], NZ, Y, 0.65);
      strip(bandMat, [10, 0.025, -18.92], [44, 0.025, -18.92], Z, Y, 0.65);
      strip(bandMat, [4.18, 3.18, -13], [9.82, 3.18, -13], NY, NZ, 0.45);
      strip(bandMat, [4.18, 3.18, -15.2], [9.82, 3.18, -15.2], NY, Z, 0.45);
      for (let k = 0; k < 21; k++) {
        const x = 62 + run * k;
        strip(bandMat, [x + 0.025, rise * (k + 1) + 0.015, -17.92], [x + 0.025, rise * (k + 1) + 0.015, -10.28], X, Y, 0.13);
      }
      // entrance hall: under the ceiling, the far corners, along the floor
      strip(bandMat, [-3.84, 5.99, 0], [-3.84, 5.99, -16], NY, X, 1.1);
      strip(bandMat, [3.84, 5.99, 0], [3.84, 5.99, -16], NY, NX, 1.1);
      strip(bandMat, [-3.84, 0, -15.84], [-3.84, 6, -15.84], Z, X, 1.0);
      strip(bandMat, [3.84, 0, -15.84], [3.84, 6, -15.84], Z, NX, 1.0);
      strip(bandMat, [-3.84, 0, -15.84], [-3.84, 6, -15.84], X, Z, 1.0);
      strip(bandMat, [3.84, 0, -15.84], [3.84, 6, -15.84], NX, Z, 1.0);
      strip(bandMat, [-3.84, 0.01, 0], [-3.84, 0.01, -16], Y, X, 0.7);
      strip(bandMat, [3.84, 0.01, 0], [3.84, 0.01, -16], Y, NX, 0.7);
      // great hall
      strip(bandMat, [10, 6.99, -9.26], [44, 6.99, -9.26], NY, NZ, 1.2);
      strip(bandMat, [10, 6.99, -18.94], [44, 6.99, -18.94], NY, Z, 1.2);
      strip(bandMat, [10.16, 0, -18.94], [10.16, 7, -18.94], X, Z, 1.0);
      strip(bandMat, [43.84, 0, -18.94], [43.84, 7, -18.94], NX, Z, 1.0);
      strip(bandMat, [10.16, 0, -9.26], [10.16, 7, -9.26], X, NZ, 1.0);
      strip(bandMat, [43.84, 0, -9.26], [43.84, 7, -9.26], NX, NZ, 1.0);
      strip(bandMat, [10.16, 0, -18.94], [10.16, 7, -18.94], Z, X, 1.0);
      strip(bandMat, [43.84, 0, -18.94], [43.84, 7, -18.94], Z, NX, 1.0);
      strip(bandMat, [10, 0.01, -18.94], [44, 0.01, -18.94], Y, Z, 0.7);
      strip(bandMat, [10, 0.01, -9.26], [44, 0.01, -9.26], Y, NZ, 0.7);
      // side hall
      strip(bandMat, [44, 6.99, -10.26], [62, 6.99, -10.26], NY, NZ, 1.2);
      strip(bandMat, [44, 6.99, -17.94], [62, 6.99, -17.94], NY, Z, 1.2);
      strip(bandMat, [44, 0.01, -10.26], [62, 0.01, -10.26], Y, NZ, 0.7);
      strip(bandMat, [44, 0.01, -17.94], [62, 0.01, -17.94], Y, Z, 0.7);
      // glass hall (first floor): ceiling and floor lines on the painting wall, the far corners
      strip(bandMat, [78.24, TOP - 0.01, -18.1], [78.24, TOP - 0.01, -50], NY, NX, 1.2);
      strip(bandMat, [78.24, UPPER + 0.01, -18.1], [78.24, UPPER + 0.01, -50], Y, NX, 0.7);
      strip(bandMat, [78.24, UPPER, -49.84], [78.24, TOP, -49.84], Z, NX, 1.0);
      strip(bandMat, [70.61, UPPER, -49.84], [70.61, TOP, -49.84], Z, X, 1.0);
      // warm sun spill beside the windows, on the floor and the nearby walls (no cast shadows)
      strip(spillMat, [-1.6, 0.02, -15.98], [1.6, 0.02, -15.98], Y, Z, 3.2);
      strip(spillMat, [-3.98, 0.9, -15.98], [-3.98, 4.6, -15.98], X, Z, 1.4);
      strip(spillMat, [3.98, 0.9, -15.98], [3.98, 4.6, -15.98], NX, Z, 1.4);
      strip(spillMat, [70.42, UPPER + 0.02, -18.1], [70.42, UPPER + 0.02, -50], Y, X, 3.4);
      strip(spillMat, [72.8, UPPER + 0.02, -49.98], [76, UPPER + 0.02, -49.98], Y, Z, 3.0);
      strip(spillMat, [78.38, UPPER + 0.6, -49.98], [78.38, UPPER + 4.2, -49.98], NX, Z, 1.6);
      strip(spillMat, [70.42, UPPER + 0.6, -49.98], [70.42, UPPER + 4.2, -49.98], X, Z, 1.6);
      strip(spillMat, [78.38, UPPER + 0.02, -10.12], [78.38, UPPER + 0.02, -18.08], Y, NX, 3.0);

      // under the benches
      for (const [x, z, w, d] of [[20, -14.1, 1.4, 1.4], [21.5, -13.1, 1.4, 1.0], [21.5, -15.1, 1.4, 1.0], [22.9, -14.1, 1.4, 1.4], [34, -14.1, 1.4, 1.4], [35.5, -13.3, 1.4, 1.0], [35.5, -14.9, 1.4, 1.0], [0, -13.8, 2.4, 1.2]]) {
        paintedShadow(floorShadowTex, w * 1.5, d * 1.5, [x, 0.012, z], [-Math.PI / 2, 0, 0], 0.16);
      }

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
        const restoration = getRestoredArtworkImage(artwork.image_url);
        try {
          texture = keep(await loader.loadAsync(optimizedImage(restoration?.src || artwork.image_url)));
        } catch {
          return;
        }
        if (disposed) return;
        if (restoration) {
          const source = texture.image;
          const canvas = document.createElement('canvas');
          canvas.width = 1024; canvas.height = 1024;
          const ctx = canvas.getContext('2d');
          const blue = restoration.src.endsWith('1787070962764.jpg');
          const side = blue ? source.width * (949 / 1170) : Math.min(source.width, source.height);
          const cx = source.width * 0.5, cy = source.height * (blue ? 569.5 / 1153 : 0.5);
          ctx.drawImage(source, cx - side / 2, cy - side / 2, side, side, 0, 0, 1024, 1024);
          texture = keep(new THREE.CanvasTexture(canvas));
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = maxAnisotropy;
        const image = texture.image;
        const aspect = image.width / image.height;
        let height = 1.75, width = height * aspect;
        if (width > 2.2) { width = 2.2; height = width / aspect; }
        const cutOut = artwork.round || hasTransparentCorners(image);
        const faceMat = keep(new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.02, toneMapped: false }));
        const art = cutOut
          ? new THREE.Mesh(keep(artwork.round ? new THREE.CircleGeometry(height / 2, 72) : new THREE.PlaneGeometry(width, height)), faceMat)
          : new THREE.Mesh(keep(new THREE.BoxGeometry(width, height, 0.065)), [artworkEdgeMat, artworkEdgeMat, artworkEdgeMat, artworkEdgeMat, faceMat, canvasEdgeMat]);
        if (artwork.round) {
          const backing = new THREE.Mesh(keep(new THREE.CylinderGeometry(height / 2, height / 2, 0.065, 72)), artworkEdgeMat);
          backing.rotation.x = Math.PI / 2;
          backing.position.z = 0.045;
          backing.castShadow = true;
          group.add(backing);
        }
        art.position.z = artwork.round ? 0.081 : cutOut ? 0.055 : 0.07;
        art.castShadow = true;
        if (cutOut) art.customDepthMaterial = keep(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: texture, alphaTest: 0.5 }));
        art.userData = { id: artwork.id };
        group.add(art);
        paintingMeshes.push(art);
        // the canvas's soft shadow on the wall, painted on so it can never flicker
        const shade = new THREE.Mesh(keep(new THREE.PlaneGeometry(width * 1.6, height * 1.6)), keep(new THREE.MeshBasicMaterial({ map: wallShadowTex, transparent: true, opacity: cutOut ? 0.16 : 0.26, depthWrite: false })));
        shade.position.set(0.03, -0.07, 0.014); // behind the canvas (which starts at 0.02), clear of the wall
        shade.renderOrder = 1;
        group.add(shade);
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
      };

      // ── Loop ──
      let target = 0;
      let current = 0;
      let lastStop = -1;
      let lastProgress = -1;
      let visible = true;
      let frameId = 0;
      let lastTime = performance.now();

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
        const elapsed = (now - lastTime) / 1000;
        const delta = Math.min(elapsed, 0.05);
        lastTime = now;
        if (!visible) return;
        if (!reducedMotion) skyMat.uniforms.uTime.value += elapsed;
        // critically damped glide towards the scroll position
        current += (target - current) * (reducedMotion ? 1 : 1 - Math.exp(-delta * 2.4));
        if (Math.abs(target - current) < 0.002) current = target; // settle fully: no long, barely-moving tail
        // the pointer's gentle pull; it settles completely, so the picture is perfectly still at rest
        sway.x += (sway.tx - sway.x) * Math.min(1, delta * 2);
        sway.y += (sway.ty - sway.y) * Math.min(1, delta * 2);
        if (Math.abs(sway.tx - sway.x) < 0.00005) sway.x = sway.tx;
        if (Math.abs(sway.ty - sway.y) < 0.00005) sway.y = sway.ty;
        placeCamera(current);
        renderer.render(scene, camera);
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
        sun.shadow.map?.dispose();
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
      className="relative bg-[#f8f4ed]"
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

        <div className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-[#f8f4ed] transition-opacity duration-1000 ${status === 'ready' ? 'opacity-0' : 'opacity-100'}`}>
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
