'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// ── Gallery layout (metres) ─────────────────────────────────────
const HALL_WIDTH = 7.2;
const HALL_HEIGHT = 7.5;
const FIRST_PAINTING_Z = -4.5;
const PAINTING_SPACING = 5;
const EYE_HEIGHT = 1.65;
const HANG_HEIGHT = 1.8;
const STOP_SCREEN_SHARE = 82; // svh of scrolling per camera stop

const WALL_COLOR = 0xf7f3ed;
const FLOOR_COLOR = 0xeee6da;
const FOG_COLOR = 0xf6f0e8;

function optimizedImage(url) {
  return `/_next/image?url=${encodeURIComponent(url)}&w=1080&q=75`;
}

const smootherstep = t => t * t * t * (t * (t * 6 - 15) + 10);

function cssFont(variable, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || fallback;
}

export default function PortfolioGallery({ artworks, artistName }) {
  const rootRef = useRef(null);
  const canvasHostRef = useRef(null);
  const router = useRouter();
  const [status, setStatus] = useState('loading'); // loading | ready | unsupported
  const [stop, setStop] = useState(0); // 0 = entrance, 1..N = painting, N+1 = exit
  const [hovering, setHovering] = useState(false);
  const paintings = artworks.slice(0, 8);
  const stopCount = paintings.length + 2;

  useEffect(() => {
    if (paintings.length === 0) return undefined;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import('three');
      if (disposed || !canvasHostRef.current) return;

      const host = canvasHostRef.current;
      const isNarrow = () => window.innerWidth < 768;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      } catch {
        setStatus('unsupported');
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isNarrow() ? 1.5 : 2));
      renderer.setSize(host.clientWidth, host.clientHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.18;
      renderer.shadowMap.enabled = !isNarrow();
      renderer.shadowMap.type = THREE.PCFShadowMap;
      host.appendChild(renderer.domElement);
      renderer.domElement.style.display = 'block';

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(FOG_COLOR);
      scene.fog = new THREE.Fog(FOG_COLOR, 9, 42);

      const camera = new THREE.PerspectiveCamera(55, host.clientWidth / host.clientHeight, 0.1, 120);
      const disposables = [];
      const track = item => { disposables.push(item); return item; };
      let needsRender = true;

      // ── Light: soft sky fill + warm sun through the high windows ──
      scene.add(new THREE.HemisphereLight(0xffffff, 0xf1e6d6, 2.4));
      // Soft fill from the opposite side so the walls facing away from the sun stay bright white.
      const fill = new THREE.DirectionalLight(0xffffff, 1.1);
      fill.position.set(-12, 9, 4);
      scene.add(fill);
      const sun = new THREE.DirectionalLight(0xfff1dc, 1.5);
      sun.position.set(14, 16, 6);
      sun.castShadow = renderer.shadowMap.enabled;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.left = -12;
      sun.shadow.camera.right = 12;
      sun.shadow.camera.top = 30;
      sun.shadow.camera.bottom = -30;
      sun.shadow.camera.far = 80;
      sun.shadow.bias = -0.0005;
      scene.add(sun);
      scene.add(sun.target);

      const lastPaintingZ = FIRST_PAINTING_Z - (paintings.length - 1) * PAINTING_SPACING;
      const hallEnd = lastPaintingZ - 9;
      const hallStart = 10;
      const hallLength = hallStart - hallEnd;
      const hallCenterZ = (hallStart + hallEnd) / 2;
      sun.target.position.set(0, 0, hallCenterZ);

      const wallMat = track(new THREE.MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.92 }));
      const floorMat = track(new THREE.MeshStandardMaterial({ color: FLOOR_COLOR, roughness: 0.62 }));

      // ── Shell: floor, ceiling, side walls ──
      const floor = new THREE.Mesh(track(new THREE.PlaneGeometry(HALL_WIDTH, hallLength)), floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, 0, hallCenterZ);
      floor.receiveShadow = true;
      scene.add(floor);

      const ceiling = new THREE.Mesh(track(new THREE.PlaneGeometry(HALL_WIDTH, hallLength)), wallMat);
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.set(0, HALL_HEIGHT, hallCenterZ);
      scene.add(ceiling);

      [-1, 1].forEach(side => {
        const wall = new THREE.Mesh(track(new THREE.PlaneGeometry(hallLength, HALL_HEIGHT)), wallMat);
        wall.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
        wall.position.set(side * HALL_WIDTH / 2, HALL_HEIGHT / 2, hallCenterZ);
        wall.receiveShadow = true;
        scene.add(wall);
      });

      // ── Arches across the hall ──
      const archShape = new THREE.Shape();
      archShape.moveTo(-HALL_WIDTH / 2, 0);
      archShape.lineTo(HALL_WIDTH / 2, 0);
      archShape.lineTo(HALL_WIDTH / 2, HALL_HEIGHT);
      archShape.lineTo(-HALL_WIDTH / 2, HALL_HEIGHT);
      archShape.lineTo(-HALL_WIDTH / 2, 0);
      const opening = new THREE.Path();
      const openingHalf = 2.3;
      const springHeight = 3.4;
      opening.moveTo(-openingHalf, 0);
      opening.lineTo(-openingHalf, springHeight);
      opening.absarc(0, springHeight, openingHalf, Math.PI, 0, true);
      opening.lineTo(openingHalf, 0);
      opening.lineTo(-openingHalf, 0);
      archShape.holes.push(opening);
      const archGeo = track(new THREE.ExtrudeGeometry(archShape, { depth: 0.6, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2, curveSegments: 40 }));
      const pilasterGeo = track(new THREE.BoxGeometry(0.42, springHeight, 0.82));

      const archZs = [0];
      for (let i = 1; i < paintings.length; i += 2) archZs.push(FIRST_PAINTING_Z - i * PAINTING_SPACING - PAINTING_SPACING / 2);
      archZs.push(hallEnd + 4);
      archZs.forEach(z => {
        const arch = new THREE.Mesh(archGeo, wallMat);
        arch.position.set(0, 0, z - 0.3);
        arch.castShadow = true;
        arch.receiveShadow = true;
        scene.add(arch);
        [-1, 1].forEach(side => {
          const pilaster = new THREE.Mesh(pilasterGeo, wallMat);
          pilaster.position.set(side * (openingHalf + 0.21), springHeight / 2, z);
          pilaster.castShadow = true;
          scene.add(pilaster);
        });
      });

      // ── High windows, glowing sky, and sun shafts ──
      const skyMat = track(new THREE.MeshBasicMaterial({ color: 0xe4f1f7, fog: false }));
      const windowGeo = track(new THREE.PlaneGeometry(1.6, 2.4));
      const beamCanvas = document.createElement('canvas');
      beamCanvas.width = 64; beamCanvas.height = 256;
      const beamCtx = beamCanvas.getContext('2d');
      const vertical = beamCtx.createLinearGradient(0, 0, 0, 256);
      vertical.addColorStop(0, 'rgba(255,248,232,0.85)');
      vertical.addColorStop(1, 'rgba(255,248,232,0)');
      beamCtx.fillStyle = vertical;
      beamCtx.fillRect(0, 0, 64, 256);
      beamCtx.globalCompositeOperation = 'destination-in';
      const horizontal = beamCtx.createLinearGradient(0, 0, 64, 0);
      horizontal.addColorStop(0, 'rgba(0,0,0,0)');
      horizontal.addColorStop(0.5, 'rgba(0,0,0,1)');
      horizontal.addColorStop(1, 'rgba(0,0,0,0)');
      beamCtx.fillStyle = horizontal;
      beamCtx.fillRect(0, 0, 64, 256);
      const beamTex = track(new THREE.CanvasTexture(beamCanvas));
      const beamMat = track(new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
      const beamGeo = track(new THREE.PlaneGeometry(1.5, 8.5));

      for (let z = hallStart - 4; z > hallEnd + 2; z -= PAINTING_SPACING) {
        const pane = new THREE.Mesh(windowGeo, skyMat);
        pane.rotation.y = -Math.PI / 2;
        pane.position.set(HALL_WIDTH / 2 - 0.02, 5.6, z);
        scene.add(pane);
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.set(0.8, 3.2, z);
        beam.rotation.z = Math.atan2(4.4, 5.6);
        scene.add(beam);
      }

      // Bright arched doorway at the far end
      const endShape = new THREE.Shape();
      endShape.moveTo(-1.9, 0);
      endShape.lineTo(-1.9, 3.6);
      endShape.absarc(0, 3.6, 1.9, Math.PI, 0, true);
      endShape.lineTo(1.9, 0);
      endShape.lineTo(-1.9, 0);
      const endGlow = new THREE.Mesh(track(new THREE.ShapeGeometry(endShape, 40)), track(new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })));
      endGlow.position.set(0, 0, hallEnd + 0.02);
      scene.add(endGlow);
      const endWall = new THREE.Mesh(track(new THREE.PlaneGeometry(HALL_WIDTH, HALL_HEIGHT)), wallMat);
      endWall.position.set(0, HALL_HEIGHT / 2, hallEnd);
      scene.add(endWall);

      // ── Entrance title on the first arch ──
      const serif = cssFont('--font-cormorant', 'Georgia, serif');
      const sans = cssFont('--font-dm-sans', 'Helvetica, Arial, sans-serif');
      await document.fonts?.ready;
      const titleCanvas = document.createElement('canvas');
      titleCanvas.width = 2048; titleCanvas.height = 512;
      const tctx = titleCanvas.getContext('2d');
      tctx.textAlign = 'center';
      tctx.fillStyle = '#ed7189';
      tctx.font = `500 54px ${sans}`;
      tctx.letterSpacing = '22px';
      tctx.fillText(String(artistName || '').toUpperCase(), 1024, 120);
      tctx.letterSpacing = '6px';
      tctx.fillStyle = '#123a52';
      tctx.font = `300 260px ${serif}`;
      tctx.fillText('Portfolio', 1024, 390);
      const titleTex = track(new THREE.CanvasTexture(titleCanvas));
      titleTex.colorSpace = THREE.SRGBColorSpace;
      titleTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const title = new THREE.Mesh(track(new THREE.PlaneGeometry(5.6, 1.4)), track(new THREE.MeshBasicMaterial({ map: titleTex, transparent: true, toneMapped: false })));
      title.position.set(0, 6.55, 0.36);
      scene.add(title);

      // ── Paintings with frames and wall captions ──
      const loader = new THREE.TextureLoader();
      const frameMat = track(new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.45, metalness: 0.35 }));
      const paintingMeshes = [];
      const stops = [];

      // PNGs with see-through corners (e.g. round paintings) are hung as cut-outs without a box frame.
      const hasTransparentCorners = image => {
        try {
          const size = 32;
          const c = document.createElement('canvas');
          c.width = size; c.height = size;
          const ctx = c.getContext('2d');
          ctx.drawImage(image, 0, 0, size, size);
          const { data } = ctx.getImageData(0, 0, size, size);
          const alphaAt = (x, y) => data[(y * size + x) * 4 + 3];
          return [[0, 0], [size - 1, 0], [0, size - 1], [size - 1, size - 1]].every(([x, y]) => alphaAt(x, y) < 16);
        } catch {
          return false;
        }
      };

      const captionTexture = artwork => {
        const c = document.createElement('canvas');
        c.width = 1024; c.height = 420;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#123a52';
        ctx.font = `400 84px ${serif}`;
        const titleText = String(artwork.title || 'Untitled');
        ctx.fillText(titleText.length > 26 ? `${titleText.slice(0, 25)}…` : titleText, 0, 110);
        ctx.fillStyle = '#6b7c86';
        ctx.font = `400 34px ${sans}`;
        ctx.letterSpacing = '6px';
        const meta = [artwork.size, artwork.medium].filter(Boolean).join('  ·  ').toUpperCase();
        if (meta) ctx.fillText(meta.length > 46 ? `${meta.slice(0, 45)}…` : meta, 0, 190);
        ctx.fillStyle = artwork.available === false ? '#9aa5ab' : '#ed7189';
        ctx.fillText(artwork.available === false ? 'SOLD' : (artwork.price ? String(artwork.price).toUpperCase() : 'AVAILABLE'), 0, 260);
        const tex = track(new THREE.CanvasTexture(c));
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
      };

      paintings.forEach((artwork, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        const z = FIRST_PAINTING_Z - index * PAINTING_SPACING;
        const wallX = side * HALL_WIDTH / 2;
        const group = new THREE.Group();
        group.position.set(wallX - side * 0.06, HANG_HEIGHT, z);
        group.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
        scene.add(group);

        const caption = new THREE.Mesh(track(new THREE.PlaneGeometry(1.15, 0.47)), track(new THREE.MeshBasicMaterial({ map: captionTexture(artwork), transparent: true, toneMapped: false })));
        group.add(caption);

        // Viewer stands across the hall, looking straight at the painting
        const viewDistance = isNarrow() ? 3.9 : 3.5;
        const position = new THREE.Vector3(wallX - side * viewDistance, EYE_HEIGHT, z);
        stops.push({ position, look: new THREE.Vector3(wallX, HANG_HEIGHT - 0.05, z) });

        loader.loadAsync(optimizedImage(artwork.image_url)).then(texture => {
          if (disposed) { texture.dispose(); return; }
          track(texture);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
          const aspect = texture.image.width / texture.image.height || 1;
          let height = 1.7;
          let width = height * aspect;
          if (width > 2.5) { width = 2.5; height = width / aspect; }
          const cutout = hasTransparentCorners(texture.image);
          const artMat = track(new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, transparent: cutout, alphaTest: cutout ? 0.02 : 0 }));

          let art;
          if (cutout && !artwork.round) {
            art = new THREE.Mesh(track(new THREE.PlaneGeometry(width, height)), artMat);
            // Soft contact shadow behind the cut-out instead of a frame
            const shadowCanvas = document.createElement('canvas');
            shadowCanvas.width = shadowCanvas.height = 128;
            const sctx = shadowCanvas.getContext('2d');
            const glow = sctx.createRadialGradient(64, 64, 10, 64, 64, 64);
            glow.addColorStop(0, 'rgba(60,45,30,0.28)');
            glow.addColorStop(1, 'rgba(60,45,30,0)');
            sctx.fillStyle = glow;
            sctx.fillRect(0, 0, 128, 128);
            const shadow = new THREE.Mesh(
              track(new THREE.PlaneGeometry(width * 1.18, height * 1.18)),
              track(new THREE.MeshBasicMaterial({ map: track(new THREE.CanvasTexture(shadowCanvas)), transparent: true, depthWrite: false })),
            );
            shadow.position.set(0.06, -0.08, -0.02);
            group.add(shadow);
          } else if (artwork.round) {
            const radius = Math.min(width, height) / 2;
            art = new THREE.Mesh(track(new THREE.CircleGeometry(radius, 96)), artMat);
            const ring = new THREE.Mesh(track(new THREE.TorusGeometry(radius + 0.03, 0.035, 16, 96)), frameMat);
            ring.castShadow = true;
            group.add(ring);
            width = height = radius * 2;
          } else {
            art = new THREE.Mesh(track(new THREE.PlaneGeometry(width, height)), artMat);
            const frame = new THREE.Mesh(track(new THREE.BoxGeometry(width + 0.1, height + 0.1, 0.06)), frameMat);
            frame.position.z = -0.035;
            frame.castShadow = true;
            group.add(frame);
          }
          art.position.z = 0.005;
          art.userData = { index, id: artwork.id };
          group.add(art);
          paintingMeshes.push(art);
          caption.position.set(width / 2 + 0.85, -0.45, 0);
          needsRender = true;
        }).catch(() => {});
      });

      // ── Camera path: entrance → each painting → toward the light ──
      const keyframes = [
        { position: new THREE.Vector3(0, EYE_HEIGHT, 8.5), look: new THREE.Vector3(0, 4.6, 0) },
        ...stops,
        { position: new THREE.Vector3(0, EYE_HEIGHT, lastPaintingZ - 2.5), look: new THREE.Vector3(0, 2.2, hallEnd) },
      ];
      const lookMatrix = new THREE.Matrix4();
      const up = new THREE.Vector3(0, 1, 0);
      const orientations = keyframes.map(frame => new THREE.Quaternion().setFromRotationMatrix(lookMatrix.lookAt(frame.position, frame.look, up)));
      const forward = new THREE.Quaternion().setFromRotationMatrix(lookMatrix.lookAt(new THREE.Vector3(0, EYE_HEIGHT, 0), new THREE.Vector3(0, EYE_HEIGHT, -10), up));

      const tempQuat = new THREE.Quaternion();
      const placeCamera = progress => {
        const f = Math.min(keyframes.length - 1, Math.max(0, progress));
        const i = Math.min(keyframes.length - 2, Math.floor(f));
        const t = smootherstep(f - i);
        camera.position.lerpVectors(keyframes[i].position, keyframes[i + 1].position, t);
        // Turn away from one painting toward the corridor, then toward the next,
        // so the view never swings through a wall when crossing sides.
        if (t < 0.5) tempQuat.slerpQuaternions(orientations[i], forward, smootherstep(t * 2));
        else tempQuat.slerpQuaternions(forward, orientations[i + 1], smootherstep(t * 2 - 1));
        camera.quaternion.copy(tempQuat);
      };

      // ── Scroll → progress, with gentle inertia ──
      let target = 0;
      let current = 0;
      let visible = true;
      let frameId = 0;
      let lastStop = -1;
      let lastTime = performance.now();

      const readScroll = () => {
        const root = rootRef.current;
        if (!root) return;
        const rect = root.getBoundingClientRect();
        const travel = root.offsetHeight - window.innerHeight;
        const progress = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
        target = progress * (keyframes.length - 1);
      };

      const resize = () => {
        const w = host.clientWidth;
        const h = host.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.fov = camera.aspect < 1 ? 72 : 55;
        camera.updateProjectionMatrix();
        needsRender = true;
      };

      const tick = () => {
        frameId = requestAnimationFrame(tick);
        const now = performance.now();
        const delta = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        if (!visible) return;
        const before = current;
        current += (target - current) * (reducedMotion ? 1 : Math.min(1, delta * 4.5));
        if (Math.abs(target - current) < 0.0005) current = target;
        if (current !== before) needsRender = true;
        if (!needsRender) return;
        placeCamera(current);
        renderer.render(scene, camera);
        needsRender = false;

        const nearest = Math.round(current);
        if (nearest !== lastStop) {
          lastStop = nearest;
          setStop(nearest);
        }
      };

      // ── Click a painting to open it ──
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const pick = event => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        return raycaster.intersectObjects(paintingMeshes, false)[0]?.object || null;
      };
      const onMove = event => setHovering(Boolean(pick(event)));
      const onClick = event => {
        const hit = pick(event);
        if (hit) router.push(`/portfolio/${hit.userData.id}`);
      };
      renderer.domElement.addEventListener('pointermove', onMove);
      renderer.domElement.addEventListener('click', onClick);

      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) needsRender = true;
      });
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
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
    // Paintings come from the server render and don't change while mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (paintings.length === 0 || status === 'unsupported') return null;

  const activePainting = stop >= 1 && stop <= paintings.length ? paintings[stop - 1] : null;
  const atEnd = stop >= stopCount - 1;

  function skipToCollection() {
    document.getElementById('portfolio-collection')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <section
      ref={rootRef}
      className="relative bg-[#f6f0e8]"
      style={{ height: `${stopCount * STOP_SCREEN_SHARE}svh` }}
      aria-label="Walk-through gallery of portfolio paintings"
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div ref={canvasHostRef} className="absolute inset-0" style={{ cursor: hovering ? 'pointer' : 'default' }} />

        {/* Loading veil */}
        <div className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-[#f6f0e8] transition-opacity duration-700 ${status === 'ready' ? 'opacity-0' : 'opacity-100'}`}>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#075f8f]/60">Opening the gallery…</p>
        </div>

        {/* Skip */}
        <button
          type="button"
          onClick={skipToCollection}
          className="absolute right-4 top-24 rounded-full bg-white/70 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#075f8f] backdrop-blur transition hover:bg-white sm:right-8 sm:top-32"
        >
          Skip to collection ↓
        </button>

        {/* Progress dots */}
        <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col gap-2.5 sm:right-8 md:flex" aria-hidden="true">
          {Array.from({ length: stopCount }).map((_, i) => (
            <span key={i} className={`block h-1.5 w-1.5 rounded-full transition-all duration-300 ${i === stop ? 'scale-150 bg-[#075f8f]' : 'bg-[#075f8f]/25'}`} />
          ))}
        </div>

        {/* Bottom card: hint, current painting, or exit */}
        <div className="absolute inset-x-0 bottom-6 flex justify-center px-4 sm:bottom-10">
          {stop === 0 && (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#075f8f]/70">Scroll to walk through the gallery</p>
              <span className="block h-9 w-5 rounded-full border border-[#075f8f]/40 p-1">
                <span className="mx-auto block h-2 w-1 animate-bounce rounded-full bg-[#075f8f]/60" />
              </span>
            </div>
          )}

          {activePainting && (
            <div key={activePainting.id} className="flex w-full max-w-md items-center justify-between gap-4 rounded-2xl border border-white/60 bg-white/75 px-5 py-4 shadow-[0_12px_40px_rgba(6,58,91,.12)] backdrop-blur-md">
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-[0.28em] text-[#ed7189]">
                  {String(stop).padStart(2, '0')} / {String(paintings.length).padStart(2, '0')}
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
              className="rounded-full bg-[#075f8f] px-6 py-3 text-[10px] uppercase tracking-[0.22em] text-white shadow-lg transition hover:bg-[#ed7189]"
            >
              Explore the full collection ↓
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
