'use client';

import { useEffect, useRef } from 'react';
import styles from './HomeMistTransition.module.css';

export default function HomeMistTransition() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = document.querySelector('.intro-embedded');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!hero || motion.matches) return;
    let disposed = false;
    let cleanup;

    async function initialize() {
      const THREE = await import('three');
      if (disposed) return;
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100);
      const texture = new THREE.TextureLoader().load('/cloud-flight/cloud-mist-v2.webp');
      texture.colorSpace = THREE.SRGBColorSpace;
      const geometry = new THREE.PlaneGeometry(1, 1);
      const banks = [];
      for (let depth = 0; depth < 7; depth++) {
        for (const side of [-1, 1]) {
          const material = new THREE.MeshBasicMaterial({
            map: texture, color: '#d8edfa', transparent: true,
            depthWrite: false, opacity: 0, toneMapped: false,
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(0, -depth * 0.6 + side * 0.7, -depth * 9);
          mesh.rotation.z = side * (0.12 + (depth % 3) * 0.06);
          scene.add(mesh);
          banks.push({ mesh, side, depth });
        }
      }
      let frame = 0, last = 0, elapsed = 0, width = 0, height = 0;
      let contextLost = false;
      const look = new THREE.Vector2();
      const targetLook = new THREE.Vector2();
      let touchOrigin = null;

      function pointerMove(event) {
        if (event.pointerType === 'touch') return;
        targetLook.set(
          THREE.MathUtils.clamp(event.clientX / window.innerWidth * 2 - 1, -1, 1),
          THREE.MathUtils.clamp(event.clientY / window.innerHeight * 2 - 1, -1, 1),
        );
        wake();
      }
      function recenter() { targetLook.set(0, 0); touchOrigin = null; wake(); }
      function pointerOut(event) { if (!event.relatedTarget) recenter(); }
      function touchStart(event) {
        if (event.touches.length !== 1 || event.target.closest?.('a, button, input, textarea, select, [role="dialog"]')) return;
        touchOrigin = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      }
      function touchMove(event) {
        if (!touchOrigin || event.touches.length !== 1) return;
        const touch = event.touches[0];
        targetLook.set(
          THREE.MathUtils.clamp((touch.clientX - touchOrigin.x) / window.innerWidth * 3, -1, 1),
          THREE.MathUtils.clamp((touch.clientY - touchOrigin.y) / window.innerHeight * 3, -1, 1),
        );
        wake();
      }

      function draw(now) {
        frame = 0;
        const progress = 1 - hero.getBoundingClientRect().bottom / window.innerHeight;
        hero.style.setProperty('--sky-departure', String(Math.max(0, Math.min(1, progress))));
        const active = progress > 0 && progress < 4.1 && !document.hidden && !motion.matches && !contextLost;
        canvas.style.opacity = active ? '1' : '0';
        if (!active) { last = 0; return; }
        const delta = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
        elapsed += delta;
        last = now;
        // Frame-rate-independent easing lets the view trail the hand and settle.
        look.x = THREE.MathUtils.damp(look.x, targetLook.x, 3.2, delta);
        look.y = THREE.MathUtils.damp(look.y, targetLook.y, 3.2, delta);
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (w !== width || h !== height) {
          width = w; height = h;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }
        const horizontal = Math.max(0.6, Math.min(1.8, camera.aspect));
        const envelope = THREE.MathUtils.smoothstep(progress, 0, 0.35) *
          (1 - THREE.MathUtils.smoothstep(progress, 3.1, 4.1));
        camera.position.set(
          Math.sin(progress * 0.7) * horizontal * 0.35 + look.x * horizontal * 1.25,
          -progress * 0.9 - look.y * 0.9,
          16 - progress * 17,
        );
        camera.rotation.set(-look.y * 0.025, -look.x * 0.04, -look.x * 0.006);
        banks.forEach(({ mesh, side, depth }) => {
          const distance = camera.position.z - mesh.position.z;
          const near = THREE.MathUtils.smoothstep(distance, 2, 7);
          const far = 1 - THREE.MathUtils.smoothstep(distance, 24, 48);
          mesh.material.opacity = near * far * envelope * (0.38 + (depth % 3) * 0.05);
          mesh.position.x = side * horizontal * (7.5 + Math.sin(elapsed * 0.06 + depth) * 0.3);
          const bankWidth = horizontal * 22;
          mesh.scale.set(bankWidth, bankWidth * 683 / 1024, 1);
        });
        renderer.render(scene, camera);
        frame = requestAnimationFrame(draw);
      }
      function wake() {
        if (!disposed && !frame) frame = requestAnimationFrame(draw);
      }
      function lost(event) {
        event.preventDefault(); contextLost = true; canvas.style.opacity = '0';
      }
      function restored() { contextLost = false; wake(); }
      window.addEventListener('scroll', wake, { passive: true });
      window.addEventListener('resize', wake);
      window.addEventListener('pointermove', pointerMove, { passive: true });
      window.addEventListener('pointerout', pointerOut, { passive: true });
      window.addEventListener('touchstart', touchStart, { passive: true });
      window.addEventListener('touchmove', touchMove, { passive: true });
      window.addEventListener('touchend', recenter, { passive: true });
      window.addEventListener('touchcancel', recenter, { passive: true });
      window.addEventListener('blur', recenter);
      document.addEventListener('visibilitychange', wake);
      motion.addEventListener('change', wake);
      canvas.addEventListener('webglcontextlost', lost);
      canvas.addEventListener('webglcontextrestored', restored);
      wake();
      cleanup = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('scroll', wake);
        window.removeEventListener('resize', wake);
        window.removeEventListener('pointermove', pointerMove);
        window.removeEventListener('pointerout', pointerOut);
        window.removeEventListener('touchstart', touchStart);
        window.removeEventListener('touchmove', touchMove);
        window.removeEventListener('touchend', recenter);
        window.removeEventListener('touchcancel', recenter);
        window.removeEventListener('blur', recenter);
        document.removeEventListener('visibilitychange', wake);
        motion.removeEventListener('change', wake);
        canvas.removeEventListener('webglcontextlost', lost);
        canvas.removeEventListener('webglcontextrestored', restored);
        geometry.dispose(); texture.dispose();
        banks.forEach(({ mesh }) => mesh.material.dispose());
        renderer.dispose();
        hero.style.removeProperty('--sky-departure');
      };
    }
    initialize().catch(() => { canvas.style.opacity = '0'; });
    return () => { disposed = true; cleanup?.(); };
  }, []);

  return (
    <>
      <div className={styles.pathway} aria-hidden="true" />
      <canvas ref={canvasRef} className={styles.mist} aria-hidden="true" />
    </>
  );
}
