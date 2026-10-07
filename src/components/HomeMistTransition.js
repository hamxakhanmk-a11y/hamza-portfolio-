'use client';

import { useEffect, useRef } from 'react';
import styles from './HomeMistTransition.module.css';

export function HomeSkyIntro() {
  return <div className={styles.openingSky} data-home-sky aria-hidden="true" />;
}

export default function HomeMistTransition() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = document.querySelector('.intro-embedded');
    const sky = document.querySelector('[data-home-sky]');
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
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      camera.position.z = 1;
      let textureReady = false;
      const texture = new THREE.TextureLoader().load('/cloud-flight/cloud-mist-v2.webp', () => {
        textureReady = true;
        if (sky) sky.dataset.ready = 'true';
        wake();
      }, undefined, () => {
        if (sky) sky.dataset.ready = 'true';
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
        uCloudFlow: { value: 0 },
      };
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
              uniform float uCloudFlow;
              float cloudHash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
              }
              float cloudNoise(vec2 p) {
                vec2 cell = floor(p), f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(mix(cloudHash(cell), cloudHash(cell + vec2(1.0, 0.0)), f.x),
                  mix(cloudHash(cell + vec2(0.0, 1.0)), cloudHash(cell + vec2(1.0)), f.x), f.y);
              }
              float cloudFbm(vec2 p) {
                float value = 0.0, amplitude = 0.5;
                for (int octave = 0; octave < 4; octave++) {
                  value += amplitude * cloudNoise(p);
                  p = mat2(1.6, -1.2, 1.2, 1.6) * p + 3.7;
                  amplitude *= 0.5;
                }
                return value;
              }
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
                vec2 field = (screen - displacement) * 3.0 - vec2(0.0, uCloudFlow);
                float broad = cloudFbm(field);
                float vapor = cloudFbm(field * 2.2 + vec2(broad * 1.8, broad));
                vec2 center = vec2(uCloudResolution.x / uCloudResolution.y * 0.5, 0.5);
                vec2 stirredUv = (screen - displacement - center) / vec2(1.5, 1.0) + 0.5;
                vec4 wisps = texture2D(map, clamp(stirredUv + vec2((broad - 0.5) * 0.12, (vapor - 0.5) * 0.18), 0.0, 1.0));
                float surrounding = smoothstep(0.12, 0.48, abs(vMapUv.x - 0.5));
                float density = smoothstep(0.20, 0.62, broad * 0.65 + vapor * 0.35);
                float opacity = clamp(density * (0.85 + surrounding * 0.12) + wisps.a * 0.3, 0.0, 0.96);
                vec3 mistColor = mix(vec3(0.50, 0.70, 0.80), vec3(0.96, 0.98, 1.0), smoothstep(0.28, 0.65, vapor));
                mistColor = mix(mistColor, wisps.rgb, wisps.a * 0.35);
                diffuseColor *= vec4(mistColor, opacity);
              #endif
            `);
          };
          material.customProgramCacheKey = () => 'continuous-cloud-mist-v2';
          const mesh = new THREE.Mesh(geometry, material);
          mesh.scale.set(2, 2, 1);
          scene.add(mesh);
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
        const skyHeight = sky?.offsetHeight || 1;
        const introProgress = Math.max(0, Math.min(1, window.scrollY / skyHeight));
        const opening = Boolean(sky && sky.getBoundingClientRect().bottom > 0);
        const active = (opening || (progress > 0 && progress < 4.1)) && !document.hidden && !motion.matches && !contextLost;
        canvas.style.opacity = active && textureReady ? '1' : '0';
        canvas.style.backgroundColor = 'transparent';
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
        }
        const flightProgress = opening ? introProgress : progress;
        const envelope = opening ? 1 - THREE.MathUtils.smoothstep(introProgress, 0.45, 1) :
          THREE.MathUtils.smoothstep(progress, 0, 0.35) * (1 - THREE.MathUtils.smoothstep(progress, 3.1, 4.1));
        stirringUniforms.uCloudFlow.value = flightProgress * 1.2 + elapsed * 0.035;
        material.opacity = envelope;
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
        material.dispose();
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
