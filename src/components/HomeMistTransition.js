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
      let textureReady = false;
      let introStart = null;
      let introFinished = window.scrollY > 80;
      const texture = new THREE.TextureLoader().load('/cloud-flight/cloud-mist-v2.webp', () => {
        textureReady = true;
        wake();
      }, undefined, () => {
        introFinished = true;
        wake();
      });
      texture.colorSpace = THREE.SRGBColorSpace;
      const geometry = new THREE.PlaneGeometry(1, 1);
      const trailCount = 20;
      const trails = Array.from({ length: trailCount }, () => new THREE.Vector4());
      const strengths = new Float32Array(trailCount);
      const resolution = new THREE.Vector2(1, 1);
      let trailIndex = 0;
      let previousPointer = null;
      const stirringUniforms = {
        uCloudTrails: { value: trails },
        uCloudStrengths: { value: strengths },
        uCloudResolution: { value: resolution },
      };
      const banks = [];
      for (let depth = 0; depth < 7; depth++) {
        for (const side of [-1, 1]) {
          const material = new THREE.MeshBasicMaterial({
            map: texture, color: '#d8edfa', transparent: true,
            depthWrite: false, opacity: 0, toneMapped: false,
          });
          // Distort the vapor locally in screen space, without steering the camera.
          material.onBeforeCompile = (shader) => {
            Object.assign(shader.uniforms, stirringUniforms);
            shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
              #include <common>
              uniform vec4 uCloudTrails[20];
              uniform float uCloudStrengths[20];
              uniform vec2 uCloudResolution;
            `).replace('#include <map_fragment>', `
              #ifdef USE_MAP
                vec2 screen = gl_FragCoord.xy / uCloudResolution.y;
                vec2 displacement = vec2(0.0);
                for (int i = 0; i < 20; i++) {
                  vec2 offset = screen - uCloudTrails[i].xy;
                  float influence = exp(-dot(offset, offset) / 0.018);
                  vec2 curl = vec2(-offset.y, offset.x);
                  float spin = uCloudTrails[i].z + uCloudTrails[i].w;
                  displacement += influence * uCloudStrengths[i] *
                    (uCloudTrails[i].zw * 0.6 + curl * spin * 4.0);
                }
                vec2 pixels = displacement * uCloudResolution.y;
                vec2 stirredUv = vMapUv - dFdx(vMapUv) * pixels.x - dFdy(vMapUv) * pixels.y;
                diffuseColor *= texture2D(map, clamp(stirredUv, 0.0, 1.0));
              #endif
            `);
          };
          material.customProgramCacheKey = () => 'cloud-stirring-v1';
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(0, -depth * 0.6 + side * 0.7, -depth * 9);
          mesh.rotation.z = side * (0.12 + (depth % 3) * 0.06);
          scene.add(mesh);
          banks.push({ mesh, side, depth });
        }
      }
      let frame = 0, last = 0, elapsed = 0, width = 0, height = 0;
      let contextLost = false;
      let touchOrigin = null;

      function stir(x, y) {
        const point = new THREE.Vector2(x / window.innerHeight, (window.innerHeight - y) / window.innerHeight);
        if (previousPointer) {
          const velocity = point.clone().sub(previousPointer);
          if (velocity.lengthSq() > 0.000002) {
            velocity.clampLength(0, 0.12);
            trails[trailIndex].set(point.x, point.y, velocity.x, velocity.y);
            strengths[trailIndex] = 1;
            trailIndex = (trailIndex + 1) % trailCount;
          }
        }
        previousPointer = point;
        wake();
      }

      function pointerMove(event) {
        if (event.pointerType === 'touch') return;
        stir(event.clientX, event.clientY);
      }
      function recenter() { previousPointer = null; touchOrigin = null; }
      function pointerOut(event) { if (!event.relatedTarget) recenter(); }
      function touchStart(event) {
        if (event.touches.length !== 1 || event.target.closest?.('a, button, input, textarea, select, [role="dialog"]')) return;
        touchOrigin = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        previousPointer = null;
        stir(touchOrigin.x, touchOrigin.y);
      }
      function touchMove(event) {
        if (!touchOrigin || event.touches.length !== 1) return;
        const touch = event.touches[0];
        stir(touch.clientX, touch.clientY);
      }

      function draw(now) {
        frame = 0;
        const progress = 1 - hero.getBoundingClientRect().bottom / window.innerHeight;
        hero.style.setProperty('--sky-departure', String(Math.max(0, Math.min(1, progress))));
        if (window.scrollY > 80 || motion.matches) introFinished = true;
        if (!introFinished && textureReady && !document.hidden && introStart === null) introStart = now;
        const introProgress = introStart === null ? 0 : Math.min(1, (now - introStart) / 1000);
        if (introProgress === 1) introFinished = true;
        const opening = !introFinished && textureReady;
        const active = (opening || (progress > 0 && progress < 4.1)) && !document.hidden && !motion.matches && !contextLost;
        canvas.style.opacity = active || !introFinished ? '1' : '0';
        canvas.style.backgroundColor = !introFinished ? `rgba(173, 213, 232, ${0.7 * (1 - introProgress)})` : 'transparent';
        if (!active) { last = 0; return; }
        const delta = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
        elapsed += delta;
        last = now;
        for (let i = 0; i < trailCount; i++) strengths[i] *= Math.exp(-delta * 1.4);
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (w !== width || h !== height) {
          width = w; height = h;
          renderer.setSize(w, h, false);
          renderer.getDrawingBufferSize(resolution);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }
        const horizontal = Math.max(0.6, Math.min(1.8, camera.aspect));
        const introEase = introProgress * introProgress * (3 - 2 * introProgress);
        const flightProgress = opening ? introEase : progress;
        const envelope = opening ? 1 - THREE.MathUtils.smoothstep(introProgress, 0.25, 1) :
          THREE.MathUtils.smoothstep(progress, 0, 0.35) * (1 - THREE.MathUtils.smoothstep(progress, 3.1, 4.1));
        camera.position.set(
          Math.sin(flightProgress * 0.7) * horizontal * 0.35,
          -flightProgress * 0.9,
          opening ? 9 - introEase * 20 : 16 - progress * 17,
        );
        banks.forEach(({ mesh, side, depth }) => {
          const distance = camera.position.z - mesh.position.z;
          const near = THREE.MathUtils.smoothstep(distance, 2, 7);
          const far = 1 - THREE.MathUtils.smoothstep(distance, 24, 48);
          mesh.material.opacity = near * far * envelope * (opening ? 0.85 : 0.38 + (depth % 3) * 0.05);
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
