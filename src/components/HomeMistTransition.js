'use client';

import { useEffect, useRef } from 'react';
import styles from './HomeMistTransition.module.css';
import { HOME_DESCENT_SVH } from '@/data/galleryTour';

export function HomeSkyIntro() {
  return <div className={styles.openingSky} data-home-sky aria-hidden="true" />;
}

export default function HomeMistTransition() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    let hero = document.querySelector('.intro-embedded');
    const sky = document.querySelector('[data-home-sky]');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches) return;
    let disposed = false;
    let cleanup;

    async function initialize() {
      const THREE = await import('three');
      if (disposed) return;
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      camera.position.z = 1;
      let textureReady = false;
      const texture = new THREE.TextureLoader().load('/cloud-flight/cloud-cumulus-v3.webp', () => {
        textureReady = true;
        if (sky) sky.dataset.ready = 'true';
        wake();
      }, undefined, () => {
        if (sky) sky.dataset.ready = 'true';
        wake();
      });
      texture.colorSpace = THREE.SRGBColorSpace;
      const geometry = new THREE.PlaneGeometry(1, 1);
      const trailCount = 8;
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
        uCloudFlight: { value: 0 },
        uCloudLighten: { value: 0 },
        uCloudEnvelope: { value: 1 },
        uCloudSides: { value: 0 },
        uCloudSeam: { value: -2 },
        uCloudSeamStrength: { value: 0 },
      };
          const material = new THREE.MeshBasicMaterial({
            map: texture, color: '#ffffff', transparent: true,
            depthWrite: false, opacity: 0, toneMapped: false,
          });
          // Distort the vapor locally in screen space, without steering the camera.
          material.onBeforeCompile = (shader) => {
            Object.assign(shader.uniforms, stirringUniforms);
            shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
              #include <common>
              uniform vec4 uCloudTrails[8];
              uniform float uCloudStrengths[8];
              uniform vec2 uCloudResolution;
              uniform float uCloudFlow;
              uniform float uCloudFlight;
              uniform float uCloudLighten;
              uniform float uCloudEnvelope;
              uniform float uCloudSides;
              uniform float uCloudSeam;
              uniform float uCloudSeamStrength;
            `).replace('#include <map_fragment>', `
              #ifdef USE_MAP
                vec2 screen = gl_FragCoord.xy / uCloudResolution.y;
                vec2 displacement = vec2(0.0);
                for (int i = 0; i < 8; i++) {
                  vec2 offset = screen - uCloudTrails[i].xy;
                  float influence = exp(-dot(offset, offset) / 0.018);
                  vec2 curl = vec2(-offset.y, offset.x);
                  float spin = uCloudTrails[i].z + uCloudTrails[i].w;
                  displacement += influence * uCloudStrengths[i] *
                    (uCloudTrails[i].zw * 0.6 + curl * spin * 4.0);
                }
                // Photograph preserves actual cloud lobes, rim light and occlusion.
                // Perspective expansion separates near banks from the distant horizon.
                vec2 uv = gl_FragCoord.xy / uCloudResolution;
                float aspect = uCloudResolution.x / uCloudResolution.y;
                vec2 cover = vec2(min(aspect / 1.7778, 1.0), min(1.7778 / aspect, 1.0));
                vec2 centered = uv - vec2(0.5, 0.52);
                float flight = uCloudFlight;
                float zoom = 1.0 + flight * 0.22;
                vec2 farUv = centered * cover / zoom + vec2(0.5, 0.52 + flight * 0.045);
                vec2 drift = vec2(sin(uCloudFlow * 0.15) * 0.002, 0.0);
                vec3 distant = texture2D(map, clamp(farUv + drift - displacement * 0.015, 0.002, 0.998)).rgb;
                vec2 nearUv = centered * cover / (zoom * 1.16) + vec2(0.5, 0.52 + flight * 0.075);
                vec3 nearCloud = texture2D(map, clamp(nearUv + drift - displacement * 0.03, 0.002, 0.998)).rgb;
                float banks = smoothstep(0.20, 0.48, abs(uv.x - 0.5));
                float foreground = max(banks, 1.0 - smoothstep(0.02, 0.32, uv.y));
                vec3 cloudColor = mix(distant, nearCloud, foreground * 0.24);
                // Start in shaded teal; ivory light grows gradually during descent.
                vec3 shaded = cloudColor * vec3(0.62, 0.76, 0.88);
                vec3 daylight = mix(cloudColor, vec3(0.84, 0.94, 0.99), 0.16);
                vec3 mistColor = mix(shaded, daylight, uCloudLighten);
                float opacity = uCloudEnvelope;
                float bridge = (1.0 - smoothstep(0.025, 0.36, abs(uv.y - uCloudSeam))) * uCloudSeamStrength;
                opacity = mix(opacity, 1.0, bridge);
                float sideClouds = smoothstep(0.20, 0.49, abs(uv.x - 0.5));
                opacity *= mix(1.0, sideClouds * 0.92, uCloudSides);
                diffuseColor *= vec4(mistColor, opacity);
              #endif
            `);
          };
          material.customProgramCacheKey = () => 'sculpted-cloud-flight-v6';
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
        hero.style.setProperty('--hero-edge', `${THREE.MathUtils.smoothstep(progress, 0, 0.2) * window.innerHeight * 0.4}px`);
        const skyHeight = sky?.offsetHeight || 1;
        const introProgress = Math.max(0, Math.min(1, window.scrollY / skyHeight));
        hero.style.setProperty('--hero-arrival-edge', `${(1 - introProgress) * window.innerHeight * 0.5}px`);
        const heroArrival = Math.max(0, (window.scrollY - skyHeight) / window.innerHeight);
        const opening = Boolean(sky && sky.getBoundingClientRect().bottom > 0);
        const gallery = document.querySelector('[data-sky-descent]');
        const descent = Number(gallery?.dataset.descent || 0);
        const galleryRect = gallery?.getBoundingClientRect();
        const departure = THREE.MathUtils.smoothstep(progress, 0, 1);
        const skyTone = THREE.MathUtils.smoothstep(progress, 0, 0.8);
        const skyColor = `rgb(${Math.round(6 + 134 * skyTone)} ${Math.round(58 + 126 * skyTone)} ${Math.round(91 + 117 * skyTone)})`;
        hero.style.setProperty('--journey-sky', skyColor);
        gallery?.style.setProperty('--journey-sky', skyColor);
        hero.closest('main')?.style.setProperty('--journey-sky', skyColor);
        gallery?.style.setProperty('--gallery-edge', `${(1 - departure) * window.innerHeight * 0.5}px`);
        const inDescent = galleryRect && galleryRect.top < window.innerHeight && galleryRect.bottom > 0 &&
          (descent < 1 || galleryRect.top > -window.innerHeight * HOME_DESCENT_SVH / 100);
        const arriving = Boolean(sky && heroArrival < 0.9);
        const active = (opening || arriving || (progress > 0 && progress < 1) || inDescent) && !document.hidden && !motion.matches && !contextLost;
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
        const flightProgress = window.scrollY / window.innerHeight;
        const envelope = opening ? 1 : arriving ? 1 - THREE.MathUtils.smoothstep(heroArrival, 0, 0.9) :
          departure * (1 - THREE.MathUtils.smoothstep(descent, 0.2, 0.86));
        stirringUniforms.uCloudLighten.value = opening || arriving ? THREE.MathUtils.smoothstep(introProgress, 0, 1) * 0.3 :
          THREE.MathUtils.lerp(0.3, 1, THREE.MathUtils.smoothstep((Math.max(0, Math.min(1, progress)) + descent) / 2, 0, 0.8));
        stirringUniforms.uCloudEnvelope.value = envelope;
        stirringUniforms.uCloudSides.value = opening || arriving ? THREE.MathUtils.smoothstep(introProgress, 0.3, 1) :
          1 - THREE.MathUtils.smoothstep(progress, 0.1, 1);
        const seam = opening ? hero.getBoundingClientRect().top : hero.getBoundingClientRect().bottom;
        stirringUniforms.uCloudSeam.value = 1 - seam / window.innerHeight;
        stirringUniforms.uCloudSeamStrength.value = seam > 0 && seam < window.innerHeight ? (opening ? 1 : departure) : 0;
        stirringUniforms.uCloudFlight.value = opening || arriving ? introProgress : 1 + Math.max(0, Math.min(1, progress)) * 0.4 + descent * 0.7;
        stirringUniforms.uCloudFlow.value = flightProgress * 0.65 + elapsed * 0.035;
        material.opacity = 1;
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
        hero.style.removeProperty('--hero-edge');
        hero.style.removeProperty('--hero-arrival-edge');
        hero.style.removeProperty('--journey-sky');
        hero.closest('main')?.style.removeProperty('--journey-sky');
        sky?.style.removeProperty('--sky-bridge-opacity');
        document.querySelector('[data-sky-descent]')?.style.removeProperty('--gallery-edge');
        document.querySelector('[data-sky-descent]')?.style.removeProperty('--journey-sky');
      };
    }
    let startupObserver;
    const start = () => initialize().catch(() => {
      canvas.style.opacity = '0';
      if (sky) sky.dataset.ready = 'true';
    });
    if (hero) start();
    else {
      // The async hero may arrive after this client component has mounted.
      startupObserver = new MutationObserver(() => {
        hero = document.querySelector('.intro-embedded');
        if (hero) { startupObserver.disconnect(); start(); }
      });
      startupObserver.observe(document.body, { childList: true, subtree: true });
    }
    return () => { disposed = true; startupObserver?.disconnect(); cleanup?.(); };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className={styles.mist} aria-hidden="true" />
    </>
  );
}
