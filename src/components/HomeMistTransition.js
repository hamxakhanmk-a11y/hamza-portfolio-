'use client';

import { useEffect, useRef } from 'react';
import styles from './HomeMistTransition.module.css';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const fragmentShader = `
uniform float progress;
uniform float time;
uniform float aspect;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
}
float cloud(vec2 p) {
  float sum = 0.0, weight = 0.55;
  for (int i = 0; i < 5; i++) {
    sum += weight * noise(p);
    p = mat2(1.6, -1.2, 1.2, 1.6) * p + 3.7;
    weight *= 0.5;
  }
  return sum;
}
void main() {
  vec2 p = vec2(vUv.x * aspect, vUv.y);
  vec2 drift = vec2(time * 0.018, -time * 0.009);
  float farCloud = cloud(p * 3.2 + drift + vec2(0.0, -progress * 0.55));
  float middleCloud = cloud(p * 4.8 - drift + vec2(3.7, -progress * 1.1));
  float nearCloud = cloud(p * 7.0 + drift + vec2(8.4, -progress * 1.8));
  // Banks rise past the viewer at different depths as the scroll descends.
  float farBank = 1.0 - smoothstep(0.08, 0.65,
    abs(vUv.y - (progress * 0.65 - 0.1) + (farCloud - 0.5) * 0.4));
  float middleBank = 1.0 - smoothstep(0.06, 0.55,
    abs(vUv.y - (progress * 1.0 - 0.65) + (middleCloud - 0.5) * 0.5));
  float nearBank = 1.0 - smoothstep(0.02, 0.5,
    abs(vUv.y - (progress * 1.4 - 1.8) + (nearCloud - 0.5) * 0.5));
  float pathCenter = 0.5 + sin(vUv.y * 3.0 + progress * 0.5) * 0.09;
  float sides = smoothstep(0.06, 0.42, abs(vUv.x - pathCenter));
  float envelope = smoothstep(0.0, 0.3, progress) *
                   (1.0 - smoothstep(1.9, 2.8, progress));
  float density = farBank * smoothstep(0.28, 0.7, farCloud) * 0.55
                + middleBank * smoothstep(0.3, 0.7, middleCloud) * 0.75
                + nearBank * smoothstep(0.3, 0.68, nearCloud) * 0.85;
  float alpha = min(0.68, density * (0.38 + sides * 0.72)) * envelope;
  vec3 blue = vec3(0.34, 0.66, 0.83);
  vec3 white = vec3(0.79, 0.91, 0.97);
  vec3 color = mix(blue, white, smoothstep(0.2, 0.8, middleCloud));
  gl_FragColor = vec4(color, alpha);
  #include <colorspace_fragment>
}`;

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
      // Soft clouds need no high-DPI buffer, particularly on mobile GPUs.
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
      const scene = new THREE.Scene();
      const camera = new THREE.Camera();
      const uniforms = {
        progress: { value: 0 },
        time: { value: 0 },
        aspect: { value: 1 },
      };
      const geometry = new THREE.PlaneGeometry(2, 2);
      const material = new THREE.ShaderMaterial({
        uniforms, vertexShader, fragmentShader, transparent: true,
        depthTest: false, depthWrite: false,
      });
      scene.add(new THREE.Mesh(geometry, material));
      let frame = 0, last = 0, elapsed = 0, width = 0, height = 0;
      let contextLost = false;

      function draw(now) {
        frame = 0;
        const viewportHeight = window.innerHeight;
        const progress = 1 - hero.getBoundingClientRect().bottom / viewportHeight;
        hero.style.setProperty('--sky-departure', String(Math.max(0, Math.min(1, progress))));
        const active = progress > 0 && progress < 2.8 && !document.hidden && !motion.matches && !contextLost;
        canvas.style.opacity = active ? '1' : '0';
        if (!active) { last = 0; return; }
        elapsed += last ? Math.min((now - last) / 1000, 0.05) : 0;
        last = now;
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (w !== width || h !== height) {
          width = w; height = h;
          renderer.setSize(Math.round(w * 0.7), Math.round(h * 0.7), false);
          uniforms.aspect.value = w / h;
        }
        uniforms.progress.value = progress;
        uniforms.time.value = elapsed;
        renderer.render(scene, camera);
        frame = requestAnimationFrame(draw);
      }
      function wake() {
        if (!disposed && !frame) frame = requestAnimationFrame(draw);
      }
      function lost(event) {
        event.preventDefault();
        contextLost = true;
        canvas.style.opacity = '0';
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
        geometry.dispose(); material.dispose(); renderer.dispose();
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
