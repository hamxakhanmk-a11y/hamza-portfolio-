'use client';

import { useEffect, useRef } from 'react';
import styles from './HomeMistTransition.module.css';
import { HOME_DESCENT_SVH } from '@/data/galleryTour';
import GardenIntro from './GardenIntro';

export function HomeSkyIntro() {
  return <GardenIntro />;
}

export default function HomeMistTransition() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    let hero = document.querySelector('.intro-embedded');
    const sky = document.querySelector('[data-home-sky]');
    const gardenIntro = Boolean(sky?.hasAttribute('data-garden-intro'));
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
      const texture = new THREE.TextureLoader().load('/cloud-flight/cloud-mist-v2.webp', () => {
        textureReady = true;
        if (sky && !gardenIntro) sky.dataset.ready = 'true';
        wake();
      }, undefined, () => {
        if (sky && !gardenIntro) sky.dataset.ready = 'true';
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
              uniform float uCloudLighten;
              uniform float uCloudEnvelope;
              uniform float uCloudSides;
              uniform float uCloudSeam;
              uniform float uCloudSeamStrength;
              float cloudHash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
              }
              float cloudNoise(vec2 p) {
                vec2 cell = floor(p), f = fract(p);
                f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
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
                for (int i = 0; i < 8; i++) {
                  vec2 offset = screen - uCloudTrails[i].xy;
                  float influence = exp(-dot(offset, offset) / 0.018);
                  vec2 curl = vec2(-offset.y, offset.x);
                  float spin = uCloudTrails[i].z + uCloudTrails[i].w;
                  displacement += influence * uCloudStrengths[i] *
                    (uCloudTrails[i].zw * 0.6 + curl * spin * 4.0);
                }
                vec2 field = (screen - displacement) * 2.7 - vec2(0.0, uCloudFlow);
                field += vec2(sin(field.y*1.7+uCloudFlow)*0.18, cos(field.x*1.3-uCloudFlow)*0.10);
                float broad = cloudFbm(field);
                float vapor = cloudFbm(field * 2.0 + vec2(broad * 1.4, broad * 0.8));
                vec2 center = vec2(uCloudResolution.x / uCloudResolution.y * 0.5, 0.5);
                vec2 stirredUv = (screen - displacement - center) / vec2(1.5, 1.0) + 0.5;
                vec4 wisps = texture2D(map, clamp(stirredUv + vec2((broad - 0.5) * 0.025, (vapor - 0.5) * 0.04), 0.0, 1.0));
                vec4 distant = texture2D(map, clamp(stirredUv * 0.65 + vec2(0.17, 0.22 + uCloudFlow * 0.008), 0.0, 1.0));
                float surrounding = smoothstep(0.12, 0.48, abs(vMapUv.x - 0.5));
                float density = smoothstep(0.30, 0.66, broad * 0.55 + vapor * 0.3 + distant.a * 0.15);
                float opacity = clamp(density * (0.85 + surrounding * 0.12) + wisps.a * 0.3, 0.0, 0.96) * uCloudEnvelope;
                // Feather the actual section edge with the same cloud field on both sides.
                float bridge = (1.0 - smoothstep(0.035, 0.38, abs(screen.y - uCloudSeam))) * uCloudSeamStrength;
                opacity = mix(opacity, 1.0, bridge);
                float sideClouds = smoothstep(0.20, 0.48, abs(vMapUv.x - 0.5));
                opacity *= mix(1.0, sideClouds * 0.85, uCloudSides);
                // Shade the changing density toward a consistent upper-right sun.
                // Recesses stay blue; raised edges catch ivory light like the reference.
                float sunward = cloudFbm(field + vec2(0.19, 0.26));
                float slope = clamp((broad - sunward) * 4.5, -0.45, 0.6);
                float illumination = smoothstep(-0.22, 0.40, slope + vapor * 0.22);
                float body = smoothstep(0.30, 0.65, broad);
                vec3 shadedCloud = mix(vec3(0.16, 0.27, 0.46), vec3(0.20, 0.57, 0.73), body);
                vec3 paintedCloud = mix(shadedCloud, vec3(0.94, 0.68, 0.65), illumination * 0.72);
                vec3 paleCloud = mix(vec3(0.29, 0.58, 0.78), vec3(0.92, 0.82, 0.87), illumination*0.75);
                float rim = smoothstep(0.12, 0.44, slope) * smoothstep(0.22, 0.5, density);
                vec3 mistColor = mix(paintedCloud, paleCloud, uCloudLighten);
                mistColor += vec3(0.11, 0.08, 0.025) * rim;
                mistColor = mix(mistColor, wisps.rgb, wisps.a * 0.10);
                diffuseColor *= vec4(mistColor, opacity);
              #endif
            `);
          };
          material.customProgramCacheKey = () => 'continuous-mystical-flowing-mist-v10';
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
        hero.style.setProperty('--hero-arrival-edge', `${gardenIntro ? 0 : (1 - introProgress) * window.innerHeight * 0.5}px`);
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
        const heroVisible = !opening && hero.getBoundingClientRect().top < window.innerHeight && hero.getBoundingClientRect().bottom > 0;
        const handoff = gardenIntro && opening && introProgress > 0.85;
        const active = (handoff || heroVisible || (!gardenIntro && (opening || arriving)) || (progress > 0 && progress < 1) || inDescent) && !document.hidden && !motion.matches && !contextLost;
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
        const descentEnvelope = departure * (1 - THREE.MathUtils.smoothstep(descent, 0.2, 0.86));
        const envelope = gardenIntro ? Math.max(handoff ? 0.66*THREE.MathUtils.smoothstep(introProgress,0.85,0.97) : heroVisible ? 0.66*(1-departure) : 0, descentEnvelope*1.15) : opening ? 1 : arriving ? 1-THREE.MathUtils.smoothstep(heroArrival,0,0.9) : descentEnvelope;
        stirringUniforms.uCloudLighten.value = opening || arriving ? THREE.MathUtils.smoothstep(introProgress, 0, 1) * 0.3 :
          THREE.MathUtils.lerp(0.3, 1, THREE.MathUtils.smoothstep((Math.max(0, Math.min(1, progress)) + descent) / 2, 0, 0.8));
        stirringUniforms.uCloudEnvelope.value = envelope;
        stirringUniforms.uCloudSides.value = (handoff || heroVisible) && progress <= 0 ? 0.60 : opening || arriving ? THREE.MathUtils.smoothstep(introProgress, 0.3, 1) :
          1 - THREE.MathUtils.smoothstep(progress, 0.1, 1);
        const seam = opening || arriving ? hero.getBoundingClientRect().top : hero.getBoundingClientRect().bottom;
        stirringUniforms.uCloudSeam.value = 1 - seam / window.innerHeight;
        // Let the shader's spatial feather carry the bridge offscreen. Switching
        // it off at the viewport edge made the upper cloud patch vanish at once.
        // Fade it with the same descent envelope as the surrounding vapor.
        stirringUniforms.uCloudSeamStrength.value = (handoff || heroVisible) && progress <= 0 ? 0 : opening ? 1 : envelope;
        stirringUniforms.uCloudFlow.value = flightProgress * 0.65 + elapsed * 0.065;
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
