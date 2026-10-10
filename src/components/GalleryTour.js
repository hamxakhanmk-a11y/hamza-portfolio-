'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TOUR_SLOTS, HOME_DESCENT_SVH } from '@/data/galleryTour';
import { gallerySkyVertex, gallerySkyFragment } from '@/data/gallerySky';
import { getRestoredArtworkImage, getGalleryArtworkRestoration } from '@/data/artworkImageRestoration';

// A white 3D gallery the visitor glides through by scrolling, laid out like the reference film:
// a circular table welcomes visitors into the open entrance hall (arched window and seating beyond),
// a corridor turns into the great hall (oval skylights, benches, paintings in pairs), the side
// hall leads to a wide flight of stairs, and at the top the route turns into the glass hall.
// Paintings are fixed objects on the walls, so they never move; the camera does the walking.

const EYE = 1.7;
const UPPER = 4.2; // first-floor level
const UPPER_EYE = UPPER + EYE;
const HANG = 2.1; // painting centre height above its floor
const STOP_SCREEN_SHARE = 90; // svh of scrolling per camera stop
const WALL_T = 0.3;

// Bright off-white throughout; stable contact shadows define the architecture.
const WALL = 0xfff8eb;
const FOG = 0xfffaf2;

// Where each wall place hangs: position of the canvas centre and the way it faces (rotation about y).
const BASE_PLACES = {
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
const BASE_PATH = [
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
const dwell = t => 0.75 * t + 0.25 * smootherstep(t);
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

export default function GalleryTour({ slots, artistName, descendFromSky = false, collectionId = 'portfolio-collection' }) {
  const rootRef = useRef(null);
  const hostRef = useRef(null);
  const router = useRouter();
  const [status, setStatus] = useState('loading'); // loading | ready | unsupported
  const [stop, setStop] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [descending, setDescending] = useState(descendFromSky);
  // Divide usable walls into equal bays, with space at either end.
  const PLACES = Object.fromEntries(Object.entries(BASE_PLACES).map(([id, place]) => [id, { ...place, pos: [...place.pos] }]));
  const walls = [
    { ids: [1, 2, 3], axis: 2, from: -1, to: -12 },
    { ids: [4, 5, 6], axis: 2, from: -1, to: -13 },
    { ids: [7, 8, 11, 12], axis: 0, from: 11, to: 43 },
    { ids: [9, 10, 13, 14], axis: 0, from: 11, to: 43 },
    { ids: [15, 16, 17], axis: 0, from: 45, to: 61 },
    { ids: [18, 19, 20, 21], axis: 2, from: -19.1, to: -49 },
  ];
  for (const wall of walls) {
    const occupied = wall.ids.filter(id => slots.some(entry => entry.slot === id && entry.artwork));
    occupied.forEach((id, index) => {
      PLACES[id].pos[wall.axis] = wall.from + (wall.to - wall.from) * (index + 1) / (occupied.length + 1);
    });
  }
  const hung = slots.filter(entry => entry.artwork && PLACES[entry.slot]);
  const paintingStop = id => {
    const place = PLACES[id];
    const pos = [...place.pos];
    pos[0] += Math.sin(place.yaw) * 3.5;
    pos[2] += Math.cos(place.yaw) * 3.5;
    pos[1] = id >= 18 ? UPPER_EYE : EYE;
    return { pos, look: [...place.pos], stop: { bay: [id] } };
  };
  const stopsFor = ids => ids.filter(id => hung.some(entry => entry.slot === id)).map(paintingStop);
  // Face each painting at its new position, keeping the connecting corridors and stairs.
  const PATH = [
    BASE_PATH[0],
    { pos: [1.9, EYE, 1], look: [0, 2.2, -8] }, // pass beside the table
    BASE_PATH[1],
    ...stopsFor([1, 2, 3, 4, 5, 6]),
    ...BASE_PATH.slice(5, 8),
    ...stopsFor([7, 9, 8, 10, 11, 13, 12, 14]),
    BASE_PATH[16],
    ...stopsFor([15, 16, 17]),
    ...BASE_PATH.slice(18, 22),
    ...stopsFor([18, 19, 20, 21]),
    BASE_PATH[27],
  ];
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
      const [THREE, { RoomEnvironment }, { Reflector }, { mergeGeometries }] = await Promise.all([
        import('three'),
        import('three/addons/environments/RoomEnvironment.js'),
        import('three/addons/objects/Reflector.js'),
        import('three/addons/utils/BufferGeometryUtils.js'),
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
      renderer.shadowMap.type = THREE.VSMShadowMap;
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
      scene.environmentIntensity = 0.4;
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

      // A shared ivory base with real diffuse and specular response to daylight.
      // No shadow-mask tint or brightness clamp: geometry determines the sun patches.
      const stoneSurface = (roughness, clearcoat) => keep(new THREE.MeshPhysicalMaterial({
        color: WALL,
        metalness: 0,
        roughness,
        clearcoat,
        clearcoatRoughness: 0.24,
        emissive: WALL,
        emissiveIntensity: 0.045,
        toneMapped: true,
      }));
      const wallMat = stoneSurface(0.42, 0.25);
      const floorMat = stoneSurface(0.18, 0.6);
      const ceilingMat = stoneSurface(0.6, 0.1);
      const stepMat = floorMat;
      const columnMat = wallMat;
      const artworkEdgeMat = keep(new THREE.MeshStandardMaterial({ color: 0xf3d68b, metalness: 0.35, roughness: 0.4, toneMapped: false }));
      // Procedural clouds drift independently of the gallery camera.
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
      // Doorways are cut as actual arches, with layered stone archivolts.
      const archMolding = (centre, radius, spring, yaw, depth = 0.16) => {
        const trim = new THREE.Group(); trim.position.set(...centre); trim.rotation.y = yaw;
        for (const [offset, tube] of [[0.04, 0.065], [0.16, 0.045]]) {
          const points = Array.from({ length: 49 }, (_, i) => {
            const angle = Math.PI * i / 48;
            return new THREE.Vector3(Math.cos(angle) * (radius + offset), spring + Math.sin(angle) * (radius + offset), depth);
          });
          const curve = new THREE.Mesh(keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, tube, 8, false)), wallMat);
          curve.castShadow = curve.receiveShadow = true; trim.add(curve);
          for (const side of [-1, 1]) {
            const jamb = new THREE.Mesh(keep(new THREE.BoxGeometry(tube * 2, spring, tube * 2)), wallMat);
            jamb.position.set(side * (radius + offset), spring / 2, depth);
            jamb.castShadow = jamb.receiveShadow = true; trim.add(jamb);
          }
        }
        scene.add(trim);
      };
      const wallX = (x, z0, z1, y0, y1, hole) => {
        if (!hole) return block(x - WALL_T / 2, x + WALL_T / 2, y0, y1, z0, z1);
        const [h0, h1, hTop] = hole;
        const width = Math.abs(z1 - z0), centreZ = (z0 + z1) / 2;
        const centre = centreZ - (h0 + h1) / 2;
        const radius = Math.abs(h1 - h0) / 2, spring = hTop - radius;
        const shape = new THREE.Shape();
        shape.moveTo(-width / 2, 0); shape.lineTo(centre - radius, 0);
        shape.lineTo(centre - radius, spring); shape.absarc(centre, spring, radius, Math.PI, 0, true);
        shape.lineTo(centre + radius, 0); shape.lineTo(width / 2, 0);
        shape.lineTo(width / 2, y1 - y0); shape.lineTo(-width / 2, y1 - y0); shape.closePath();
        add(new THREE.ExtrudeGeometry(shape, { depth: WALL_T, bevelEnabled: false, curveSegments: 40 }), wallMat, [x - WALL_T / 2, y0, centreZ], { rotation: [0, Math.PI / 2, 0] });
        for (const yaw of [-Math.PI / 2, Math.PI / 2]) archMolding([x, y0, (h0 + h1) / 2], radius, spring, yaw, 0.24);
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
        // Layered cornices run beneath the open roof perimeter.
        for (const [drop, reach, height] of [[0.12, 0.24, 0.12], [0.28, 0.16, 0.1], [0.4, 0.09, 0.08]]) {
          block(x0, x0 + reach, y - drop - height, y - drop, lowZ, highZ);
          block(x1 - reach, x1, y - drop - height, y - drop, lowZ, highZ);
          block(x0, x1, y - drop - height, y - drop, lowZ, lowZ + reach);
          block(x0, x1, y - drop - height, y - drop, highZ - reach, highZ);
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
      // Ionic columns: tapered shafts, layered bases, and paired spiral volutes.
      const ionicColumn = (x, z, y0, height, yaw = 0) => {
        const column = new THREE.Group();
        column.position.set(x, y0, z);
        column.rotation.y = yaw;
        const part = (geometry, y) => {
          const mesh = new THREE.Mesh(keep(geometry), columnMat);
          mesh.position.y = y;
          mesh.castShadow = mesh.receiveShadow = true;
          column.add(mesh);
          return mesh;
        };
        part(new THREE.BoxGeometry(0.86, 0.14, 0.86), 0.07);
        part(new THREE.CylinderGeometry(0.39, 0.39, 0.1, 40), 0.19);
        part(new THREE.CylinderGeometry(0.3, 0.37, 0.16, 40), 0.32);
        part(new THREE.CylinderGeometry(0.26, 0.3, height - 1.02, 48), (height - 1.02) / 2 + 0.4);
        part(new THREE.CylinderGeometry(0.32, 0.27, 0.12, 40), height - 0.56);
        part(new THREE.BoxGeometry(0.9, 0.13, 0.55), height - 0.4);
        part(new THREE.BoxGeometry(1.02, 0.15, 0.68), height - 0.075);
        for (const side of [-1, 1]) {
          const points = [];
          for (let k = 0; k <= 72; k++) {
            const t = k / 72;
            const angle = t * Math.PI * 3.5;
            const radius = 0.19 * (1 - t) + 0.025;
            points.push(new THREE.Vector3(side * (0.35 + Math.cos(angle) * radius), height - 0.3 + Math.sin(angle) * radius, 0.29));
          }
          part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 72, 0.036, 8, false), 0);
        }
        scene.add(column);
      };
      // an open wall onto the sky: slim piers every 4 m and nothing between them, no glass, no bars
      const glazing = (axis, at, a0, a1, y0, y1) => {
        const h = y1 - y0;
        if (axis === 'x') {
          const start = Math.min(a0, a1), end = Math.max(a0, a1);
          const columns = end - start <= 8.1 ? [start, end] : Array.from({ length: Math.floor((end - start) / 4) + 1 }, (_, i) => start + i * 4);
          for (const z of columns) {
            ionicColumn(at, z, y0, h, Math.PI / 2);
          }
        } else {
          for (let x = a0; x <= a1; x += 4) block(x - 0.2, x + 0.2, y0, y1, at - 0.2, at + 0.2);
        }
      };

      // Rounded corner returns soften the rectangular halls while leaving the aisle clear.
      const curvedCorner = (x, z, height, yaw, base = 0) => {
        add(new THREE.CylinderGeometry(0.65, 0.65, height, 32, 1, true, 0, Math.PI / 2), wallMat,
          [x, base + height / 2, z], { rotation: [0, yaw, 0] });
      };
      const vaultMat = stoneSurface(0.6, 0.08); vaultMat.side = THREE.DoubleSide;
      const corridorVault = () => {
        add(new THREE.CylinderGeometry(1.1, 1.1, 5.7, 48, 1, true, 0, Math.PI), vaultMat,
          [7, 2.1, -14.1], { rotation: [0, 0, Math.PI / 2] });
        for (const x of [4.35, 7, 9.65]) archMolding([x, 0, -14.1], 1.1, 2.1, Math.PI / 2, 0);
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
      // Circular ivory-stone table with a rounded solid top and pedestal base.
      // Its footprint stays inside the existing clear camera route.
      add(new THREE.CylinderGeometry(0.58, 0.64, 0.1, 64), floorMat, [0, 0.05, 1]);
      const pedestalProfile = [[0.49, 0.10], [0.49, 0.16], [0.36, 0.22],
        [0.30, 0.65], [0.42, 0.72], [0.42, 0.76]];
      add(new THREE.LatheGeometry(pedestalProfile.map(([r, y]) => new THREE.Vector2(r, y)), 64), wallMat, [0, 0, 1]);
      add(new THREE.CylinderGeometry(1.12, 1.12, 0.12, 64), floorMat, [0, 0.8, 1]);
      add(new THREE.TorusGeometry(1.085, 0.045, 12, 64), floorMat, [0, 0.82, 1], { rotation: [Math.PI / 2, 0, 0] });
      const stairSide = (length, rise, position, yaw = 0) => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0); shape.lineTo(length, 0); shape.lineTo(length, rise + 1.0);
        shape.lineTo(0, 1.0); shape.closePath();
        add(new THREE.ExtrudeGeometry(shape, { depth: 0.24, bevelEnabled: true, bevelSize: 0.045, bevelThickness: 0.045, bevelSegments: 3 }), wallMat, position, { rotation: [0, yaw, 0] });
        const cap = new THREE.Mesh(keep(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(0, 1.06, 0.12), new THREE.Vector3(length, rise + 1.06, 0.12)), 1, 0.105, 12, false)), floorMat);
        cap.rotation.y = yaw; cap.position.set(...position); cap.castShadow = true; scene.add(cap);
      };
      block(-1.2, 1.2, 0, 0.42, -13.2, -14.4, stepMat); // bench

      // ── Corridor: x 4..10, z -13..-15.2, 3.2 high ──
      floor(4, 10, -13, -15.2);
      wallZ(-13, 4.15, 9.85, 0, 3.2);
      wallZ(-15.2, 4.15, 9.85, 0, 3.2);
      corridorVault();

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
      // Solid sloping balustrades and rounded caps frame the broad main stair.
      stairSide(steps * run, UPPER, [62, 0, -17.85]);
      stairSide(steps * run, UPPER, [62, 0, -10.6]);
      // tall window facing the top of the stairs
      glazing('x', 78.4, -10.1, -18.1, UPPER, TOP);

      // ── Glass hall (first floor): x 70.4..78.4, z -18.1..-50, glass on the left, paintings on the right ──
      block(70.4, 78.4, UPPER - 0.4, UPPER, -50, -10.1, floorMat);
      wallX(78.4, -18.1, -50, UPPER, TOP);
      glazing('x', 70.4, -18.1, -50, UPPER, TOP, -1);
      ceiling(70.4, 78.4, -18.1, -50, TOP);
      archedWindowWall(70.4, 78.4, UPPER, 6, -50, 1.6, 0.6, 3.6);

      // Columns frame the halls without occupying the painting bays or camera aisle.
      ionicColumn(-3.5, -1, 0, 6, Math.PI / 2);
      ionicColumn(3.5, -1, 0, 6, -Math.PI / 2);
      ionicColumn(3.5, -12.1, 0, 6, -Math.PI / 2);
      for (const x of [11, 23, 31, 43]) {
        ionicColumn(x, -18.6, 0, 7);
        ionicColumn(x, -9.6, 0, 7, Math.PI);
      }
      for (const x of [45, 61]) {
        ionicColumn(x, -17.6, 0, 7);
        ionicColumn(x, -10.6, 0, 7, Math.PI);
      }

      curvedCorner(-4, -16, 5.55, 0);
      curvedCorner(4, -16, 5.55, -Math.PI / 2);
      curvedCorner(10, -19.1, 6.55, 0);
      curvedCorner(44, -19.1, 6.55, -Math.PI / 2);
      curvedCorner(44, -9.1, 6.55, Math.PI);
      curvedCorner(10, -9.1, 6.55, Math.PI / 2);
      curvedCorner(62, -18.1, 6.55, -Math.PI / 2);
      curvedCorner(78.4, -50, 5.55, -Math.PI / 2, UPPER);

      // Thick stone bays create real recess depth; paintings remain on the back wall.
      const alcoveMat = stoneSurface(0.6, 0.1);
      for (const id of [1, 7, 10, 15, 19]) {
        if (!bySlot.has(id)) continue;
        const place = PLACES[id], base = id >= 18 ? UPPER : 0;
        const bay = new THREE.Shape();
        bay.moveTo(-1.95,0); bay.lineTo(1.95,0); bay.lineTo(1.95,5.05); bay.lineTo(-1.95,5.05); bay.closePath();
        const opening = new THREE.Path();
        opening.moveTo(-1.48,0.18); opening.lineTo(-1.48,3.1);
        opening.absarc(0,3.1,1.48,Math.PI,0,true); opening.lineTo(1.48,0.18); opening.closePath();
        bay.holes.push(opening);
        add(new THREE.ExtrudeGeometry(bay,{depth:0.48,bevelEnabled:true,bevelThickness:0.025,bevelSize:0.025,bevelSegments:3,curveSegments:48}), alcoveMat,
          [place.pos[0],base,place.pos[2]],{rotation:[0,place.yaw,0]});
        archMolding([place.pos[0],base,place.pos[2]],1.48,3.1,place.yaw,0.52);
      }

      // Ivory amphora vases on pedestals in the empty bays beside the route.
      const vaseMat = stoneSurface(0.55, 0.14);
      const pedestalVase = (x, z, base = 0, yaw = 0) => {
        const group = new THREE.Group(); group.position.set(x, base, z); group.rotation.y = yaw;
        const part = (geometry, position) => {
          const mesh = new THREE.Mesh(keep(geometry), vaseMat);
          mesh.position.set(...position); mesh.castShadow = mesh.receiveShadow = true;
          group.add(mesh);
        };
        part(new THREE.BoxGeometry(0.92, 0.15, 0.92), [0, 0.075, 0]);
        part(new THREE.BoxGeometry(0.72, 0.95, 0.72), [0, 0.62, 0]);
        part(new THREE.BoxGeometry(0.88, 0.12, 0.88), [0, 1.15, 0]);
        const profile = [[0.17,0],[0.23,0.06],[0.19,0.13],[0.27,0.28],[0.34,0.54],[0.32,0.7],[0.15,0.88],[0.13,1.08],[0.22,1.14],[0.22,1.2]];
        part(new THREE.LatheGeometry(profile.map(([r,y]) => new THREE.Vector2(r,y)),48), [0,1.21,0]);
        for (const side of [-1,1]) {
          const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(side*0.16,2.25,0),new THREE.Vector3(side*0.48,2.17,0),new THREE.Vector3(side*0.45,1.92,0),new THREE.Vector3(side*0.28,1.82,0)]);
          part(new THREE.TubeGeometry(curve,24,0.035,8,false),[0,0,0]);
        }
        scene.add(group);
      };
      pedestalVase(-2.9,-2.6,0,Math.PI/2);
      pedestalVase(23,-17.2);
      pedestalVase(31,-11,0,Math.PI);
      pedestalVase(52,-16.9);
      pedestalVase(72,-46,UPPER,Math.PI/2);

      // Batch stationary architecture by material and shadow settings. The reflective
      // floor renders this scene again, so reducing draw calls benefits both passes.
      scene.updateMatrixWorld(true);
      const batches = new Map();
      scene.traverse(mesh => {
        if (!mesh.isMesh || Array.isArray(mesh.material) || mesh.material.transparent || mesh.material.isShaderMaterial) return;
        const key = mesh.material.uuid + ':' + mesh.castShadow + ':' + mesh.receiveShadow;
        if (!batches.has(key)) batches.set(key, []);
        batches.get(key).push(mesh);
      });
      let architectureBefore = 0, architectureAfter = 0;
      for (const meshes of batches.values()) {
        architectureBefore += meshes.length;
        architectureAfter += meshes.length < 2 ? meshes.length : 1;
        if (meshes.length < 2) continue;
        const parts = meshes.map(mesh => {
          const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
          geometry.applyMatrix4(mesh.matrixWorld);
          return geometry;
        });
        const geometry = mergeGeometries(parts, false);
        for (const part of parts) part.dispose();
        if (!geometry) continue;
        const merged = new THREE.Mesh(keep(geometry), meshes[0].material);
        merged.castShadow = meshes[0].castShadow;
        merged.receiveShadow = meshes[0].receiveShadow;
        for (const mesh of meshes) mesh.removeFromParent();
        scene.add(merged);
      }

      if (new URLSearchParams(window.location.search).has('galleryDebug')) {
        host.dataset.staticMeshesBefore = String(architectureBefore);
        host.dataset.staticMeshesAfter = String(architectureAfter);
      }

      // Low-opacity planar reflections show the real paintings and pillars in polished stone.
      // Only the current floor renders a reflection, bounding the extra render cost.
      const floorReflections = [];
      for (const [width, depth, x, z, y] of [[82.4, 59, 37.2, -20.5, 0], [8, 39.9, 74.4, -30.05, UPPER]]) {
        const reflection = new Reflector(keep(new THREE.PlaneGeometry(width, depth)), {
          color: 0xfff8eb, textureWidth: narrow ? 384 : 768, textureHeight: narrow ? 384 : 768,
          clipBias: 0.003, multisample: 0,
        });
        reflection.rotation.x = -Math.PI / 2;
        reflection.position.set(x, y + 0.009, z);
        reflection.material.transparent = true;
        reflection.material.opacity = 0.16;
        reflection.material.depthWrite = false;
        reflection.material.uniforms.uBlurStep = { value: new THREE.Vector2(1 / (narrow ? 384 : 768), 1 / (narrow ? 384 : 768)) };
        reflection.material.fragmentShader = reflection.material.fragmentShader
          .replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse; uniform vec2 uBlurStep;')
          .replace('vec4 base = texture2DProj( tDiffuse, vUv );', `vec4 base = texture2DProj(tDiffuse, vUv) * 0.2;
            for(int bx=-1;bx<=1;bx++){for(int by=-1;by<=1;by++){
              if(bx==0 && by==0) continue;
              vec4 sampleUv=vUv; sampleUv.xy+=vec2(float(bx),float(by))*uBlurStep*3.0*vUv.w;
              base+=texture2DProj(tDiffuse,sampleUv)*0.1;
            }}`)
          .replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );', 'gl_FragColor = vec4( blendOverlay( base.rgb, color ), 0.13 );');
        keep(reflection);
        scene.add(reflection);
        floorReflections.push(reflection);
      }

      // Soft, irregular spectral reflections, inspired by the light in the reference film.
      const shimmerMaterials = [];
      const shimmer = (position, rotation, width, height, seed, strength = 0.2) => {
        const material = keep(new THREE.ShaderMaterial({
          uniforms: { uTime: { value: 0 }, uSeed: { value: seed }, uStrength: { value: strength } },
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
          vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
          fragmentShader: `varying vec2 vUv;
            uniform float uTime; uniform float uSeed; uniform float uStrength;
            void main(){
              vec2 p=(vUv-0.5)*2.0;
              float t=uTime*0.065+uSeed;
              // Sparse distorted focal spots rather than repeated crescent-shaped ribbons.
              vec2 bend=p+0.1*vec2(sin(p.y*5.0+t),cos(p.x*4.0-t*0.7));
              float edge=1.0-smoothstep(0.55,1.0,length(p));
              vec2 q1=(bend-vec2(-0.45,0.42))*vec2(1.0,2.0);
              vec2 q2=(bend-vec2(0.48,0.1))*vec2(2.0,0.9);
              vec2 q3=(bend-vec2(-0.05,-0.58))*vec2(1.3,2.5);
              float gold=exp(-dot(q1,q1)*19.0);
              float blue=exp(-dot(q2,q2)*22.0);
              float pink=exp(-dot(q3,q3)*24.0);
              float breakup=0.65+0.35*sin(bend.x*9.0+bend.y*7.0+t);
              float light=gold+blue+pink;
              vec3 spectral=(gold*vec3(1.0,0.87,0.52)+blue*vec3(0.57,0.83,1.0)+pink*vec3(1.0,0.65,0.88))/max(light,0.001);
              // Concentrated near-white light, with a barely colored fringe.
              float focus=pow(min(light,1.0),0.85);
              float fringe=(1.0-focus)*0.07;
              vec3 glow=mix(vec3(1.0,0.985,0.95),spectral,fringe);
              gl_FragColor=vec4(glow,edge*focus*breakup*uStrength);
            }`,
        }));
        shimmerMaterials.push(material);
        add(new THREE.PlaneGeometry(width, height), material, position, { rotation, cast: false, receive: false });
      };
      for (const { slot } of hung) {
        const place = PLACES[slot];
        const p = [...place.pos];
        p[0] += Math.sin(place.yaw) * 0.018;
        p[2] += Math.cos(place.yaw) * 0.018;
        shimmer(p, [0, place.yaw, 0], 4.8, 4.4, slot * 1.73, 0.33);
        shimmer([place.pos[0] + Math.sin(place.yaw) * 1.6, slot >= 18 ? UPPER + 0.022 : 0.022, place.pos[2] + Math.cos(place.yaw) * 1.6], [-Math.PI / 2, 0, place.yaw], 4, 3.2, slot * 1.73, 0.13);
      }

      // Larger reflected patches also reach bare wall bays and the open floor.
      shimmer([-3.826, 3.8, -8], [0, Math.PI / 2, 0], 4.8, 3.2, 2.4, 0.2);
      shimmer([23, 3.8, -18.926], [0, 0, 0], 5.4, 3.8, 5.1, 0.22);
      shimmer([31, 3.4, -9.274], [0, Math.PI, 0], 4.8, 3.8, 8.3, 0.2);
      shimmer([52, 3.8, -17.926], [0, 0, 0], 6, 3.8, 3.7, 0.22);
      shimmer([74.4, UPPER + 0.023, -37], [-Math.PI / 2, 0, 0], 4.8, 6, 6.2, 0.18);

      // One sun casts a consistent pattern; open-sky and bounce light reach both walls.
      scene.add(new THREE.AmbientLight(0xfffcf5, 0.45));
      scene.add(new THREE.HemisphereLight(0xf5f9ff, 0xfff8ed, 1.15));
      const sun = new THREE.DirectionalLight(0xfff8eb, 2.6);
      sun.position.set(-5, 65, -35);
      sun.target.position.set(37, 0, -20);
      sun.castShadow = true;
      sun.shadow.mapSize.set(narrow ? 2048 : 4096, narrow ? 2048 : 4096);
      Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 50, bottom: -50, near: 0.5, far: 150 });
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 0.08;
      sun.shadow.radius = 4;
      sun.shadow.blurSamples = 8;
      sun.shadow.intensity = 0.78;
      scene.add(sun.target);
      scene.add(sun);
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
        const restoration = getGalleryArtworkRestoration(artwork.image_url) || getRestoredArtworkImage(artwork.image_url);
        try {
          texture = keep(await loader.loadAsync(optimizedImage(restoration?.src || artwork.image_url)));
        } catch {
          return;
        }
        if (disposed) return;
        if (restoration) {
          const source = texture.image;
          const canvas = document.createElement('canvas');
          canvas.width = 1024;
          canvas.height = restoration.crop ? Math.round(1024 * source.height * restoration.crop[3] / (source.width * restoration.crop[2])) : 1024;
          const ctx = canvas.getContext('2d');
          const blue = restoration.src.endsWith('1787070962764.jpg');
          const side = blue ? source.width * (949 / 1170) : Math.min(source.width, source.height);
          const cx = source.width * 0.5, cy = source.height * (blue ? 569.5 / 1153 : 0.5);
          if (restoration.crop) {
            const [x, y, w, h] = restoration.crop;
            ctx.drawImage(source, x * source.width, y * source.height, w * source.width, h * source.height, 0, 0, canvas.width, canvas.height);
          } else ctx.drawImage(source, cx - side / 2, cy - side / 2, side, side, 0, 0, 1024, 1024);
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
      // Give longer passages and larger turns more scroll distance, rather
      // than making every interval finish in the same amount of scrolling.
      const routeWeights = [0];
      for (let i=0;i<stopKeys.length-1;i++) {
        let length=0;
        let previous=positionCurve.getPoint(stopKeys[i]/segments);
        let previousDirection=targetCurve.getPoint(stopKeys[i]/segments).sub(previous).normalize();
        for(let sample=1;sample<=32;sample++) {
          const t=(stopKeys[i]+(stopKeys[i+1]-stopKeys[i])*sample/32)/segments;
          const position=positionCurve.getPoint(t);
          const direction=targetCurve.getPoint(t).sub(position).normalize();
          length+=position.distanceTo(previous)+previousDirection.angleTo(direction)*4;
          previous=position;previousDirection=direction;
        }
        routeWeights.push(routeWeights[i]+Math.max(4,length));
      }
      const scrollToStop = progress => {
        const distance=progress*routeWeights[routeWeights.length-1];
        let i=0;
        while(i<routeWeights.length-2 && distance>routeWeights[i+1]) i++;
        return i+(distance-routeWeights[i])/(routeWeights[i+1]-routeWeights[i]);
      };
      const lookPoint = new THREE.Vector3();
      const sway = { x: 0, y: 0, tx: 0, ty: 0 };
      const placeCamera = s => {
        if (s < 0) {
          // Land on the forecourt facing the table; the route then enters.
          const descent = clamp01(1 + s / 3);
          const flight = dwell(descent);
          camera.position.set(0, THREE.MathUtils.lerp(48, EYE, flight), THREE.MathUtils.lerp(12, 5.5, flight));
          // Ease the viewing angle itself, rather than two look-at coordinates.
          // Keep a fixed sight distance so perspective does not accelerate the turn.
          const arrivalPitch = Math.atan2(2.2 - EYE, 13.5);
          const pitch = THREE.MathUtils.lerp(-Math.PI / 6, arrivalPitch, dwell(descent));
          lookPoint.set(0, camera.position.y + Math.sin(pitch) * 24, camera.position.z - Math.cos(pitch) * 24);
          camera.lookAt(lookPoint);
          return;
        }
        const t = Math.min(1, Math.max(0, stopToKey(s) / segments));
        positionCurve.getPoint(t, camera.position);
        targetCurve.getPoint(t, lookPoint);
        camera.lookAt(lookPoint);
        const swayBlend = smootherstep(clamp01(s / 0.35));
        camera.rotateY(sway.x * swayBlend);
        camera.rotateX(sway.y * swayBlend);
      };

      // ── Loop ──
      let target = 0;
      let current = 0;
      let lastStop = -1;
      let lastProgress = -1;
      let wasDescending = descendFromSky;
      let visible = true;
      let frameId = 0;
      let lastTime = performance.now();

      const readScroll = () => {
        const root = rootRef.current;
        if (!root) return;
        const rect = root.getBoundingClientRect();
        const travel = root.offsetHeight - hostRef.current.clientHeight;
        const p = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
        const descentTravel = descendFromSky && !reducedMotion ? window.innerHeight * HOME_DESCENT_SVH / 100 : 0;
        const distance = Math.max(0, -rect.top);
        target = distance < descentTravel ? -3 * (1 - distance / descentTravel) :
          scrollToStop(clamp01((distance - descentTravel) / Math.max(1, travel - descentTravel)));
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
        if (disposed || !rootRef.current) return;
        frameId = requestAnimationFrame(tick);
        const now = performance.now();
        const elapsed = (now - lastTime) / 1000;
        const delta = Math.min(elapsed, 0.25);
        lastTime = now;
        if (!visible) return;
        if (!reducedMotion) {
          skyMat.uniforms.uTime.value += elapsed;
        }
        // critically damped glide towards the scroll position
        const step=(target-current)*(reducedMotion?1:1-Math.exp(-delta*5));
        current += reducedMotion ? step : THREE.MathUtils.clamp(step,-delta*1.4,delta*1.4);
        if (Math.abs(target - current) < 0.002) current = target; // settle fully: no long, barely-moving tail
        // the pointer's gentle pull; it settles completely, so the picture is perfectly still at rest
        sway.x += (sway.tx - sway.x) * Math.min(1, delta * 2);
        sway.y += (sway.ty - sway.y) * Math.min(1, delta * 2);
        if (Math.abs(sway.tx - sway.x) < 0.00005) sway.x = sway.tx;
        if (Math.abs(sway.ty - sway.y) < 0.00005) sway.y = sway.ty;
        placeCamera(current);
        if (descendFromSky) rootRef.current.dataset.descent = String(clamp01(1 + current / 3));
        floorReflections[0].visible = current >= 0 && camera.position.y < UPPER + 0.5;
        floorReflections[1].visible = current >= 0 && camera.position.y >= UPPER + 0.5;
        if (!reducedMotion) for (const material of shimmerMaterials) material.uniforms.uTime.value += elapsed;
        renderer.render(scene, camera);
        const nearest = Math.max(0, Math.round(current));
        const isDescending = current < -0.01;
        if (isDescending !== wasDescending) { wasDescending = isDescending; setDescending(isDescending); }
        if (nearest !== lastStop) { lastStop = nearest; setStop(nearest); }
      };

      // ── Click a painting to open it ──
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const pick = event => {
        if (current < 0) return null;
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
    document.getElementById(collectionId)?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <section
      ref={rootRef}
      id="gallery-tour"
      data-sky-descent={descendFromSky ? 'true' : undefined}
      className={`relative bg-[#f8f4ed] ${descendFromSky ? 'sky-gallery-tour' : ''}`}
      style={descendFromSky ? { '--tour-height': `${stopCount * STOP_SCREEN_SHARE}svh`, '--descent-height': `${HOME_DESCENT_SVH}svh` } : { height: `${stopCount * STOP_SCREEN_SHARE}svh` }}
      aria-label="Walk-through gallery of portfolio paintings"
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div ref={hostRef} className="gallery-tour-scene absolute inset-0" style={{ cursor: hovering ? 'pointer' : 'default' }} />

        {/* Title card over the table courtyard, as the film opens */}
        <div className={`pointer-events-none absolute inset-x-0 top-[22%] flex flex-col items-center text-center transition-opacity duration-700 ${status === 'ready' && !descending && stop === 0 ? 'opacity-100' : 'opacity-0'}`}>
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
          {descending && status === 'ready' && <p className="text-[10px] uppercase tracking-[0.35em] text-[#075f8f]/70">Scroll through the clouds</p>}
          {!descending && currentStop.kind === 'entrance' && status === 'ready' && (
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
