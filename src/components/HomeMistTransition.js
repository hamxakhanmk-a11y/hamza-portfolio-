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
      const texture = new THREE.TextureLoader().load('/cloud-flight/cloud-bank.webp');
      texture.colorSpace = THREE.SRGBColorSpace;
      const geometry = new THREE.PlaneGeometry(1, 1);
      const banks = [];
      for (let depth = 0; depth < 7; depth++) {
        for (const side of [-1, 1]) {
          const material = new THREE.MeshBasicMaterial({
            map: texture, color: '#c4e6fa', transparent: true,
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

      function draw(now) {
        frame = 0;
        const progress = 1 - hero.getBoundingClientRect().bottom / window.innerHeight;
        hero.style.setProperty('--sky-departure', String(Math.max(0, Math.min(1, progress))));
        const active = progress > 0 && progress < 4.1 && !document.hidden && !motion.matches && !contextLost;
        canvas.style.opacity = active ? '1' : '0';
        if (!active) { last = 0; return; }
        elapsed += last ? Math.min((now - last) / 1000, 0.05) : 0;
        last = now;
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
        camera.position.set(Math.sin(progress * 0.7) * horizontal * 0.35, -progress * 0.9, 16 - progress * 17);
        banks.forEach(({ mesh, side, depth }) => {
          const distance = camera.position.z - mesh.position.z;
          const near = THREE.MathUtils.smoothstep(distance, 2, 7);
          const far = 1 - THREE.MathUtils.smoothstep(distance, 24, 48);
          mesh.material.opacity = near * far * envelope * (0.42 + (depth % 3) * 0.06);
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
      document.addEventListener('visibilitychange', wake);
      motion.addEventListener('change', wake);
      canvas.addEventListener('webglcontextlost', lost);
      canvas.addEventListener('webglcontextrestored', restored);
      wake();
      cleanup = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('scroll', wake);
        window.removeEventListener('resize', wake);
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
