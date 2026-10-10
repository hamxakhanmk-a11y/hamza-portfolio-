'use client';

import { useEffect, useRef } from 'react';
import styles from './GardenIntro.module.css';

const smooth = t => { const x = Math.max(0, Math.min(1, t)); return x * x * x * (x * (x * 6 - 15) + 10); };

export default function GardenIntro() {
  const rootRef = useRef(null);
  const surfaceRef = useRef(null);
  const backdropRef = useRef(null);
  const copyRef = useRef(null);
  const canvasRef = useRef(null);
  useEffect(() => {
    const root = rootRef.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches) { root.dataset.ready = 'true'; return; }
    let disposed = false, cleanup, observer;
    async function initialize(hero) {
      const media = hero.querySelector('.intro-media');
      const original = media?.querySelector('img,video');
      if (!media || !original) { root.dataset.ready = 'true'; return; }
      const THREE = await import('three');
      if (disposed) return;
      const background = media.cloneNode(true);
      background.querySelectorAll('canvas').forEach(node => node.remove());
      backdropRef.current.append(background);
      const copy = hero.querySelector('.intro-positioned-copy')?.cloneNode(true);
      if (copy) copyRef.current.append(copy);
      const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
      const groundGeometry = new THREE.PlaneGeometry(180, 200, 180, 200);
      groundGeometry.rotateX(-Math.PI / 2);
      const positions = groundGeometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), z = positions.getZ(i);
        const side = smooth((Math.abs(x) - 2) / 17);
        const ridge = Math.sin(x * 0.17 + z * 0.12 + Math.sin(z * 0.055) * 1.8);
        positions.setY(i, side * (2.7 + ridge * 2.2 + Math.sin(z * 0.21 - x * 0.08) * 0.9) - 0.6);
      }
      groundGeometry.computeVertexNormals();
      const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xe6c48d, roughness: 0.94, transparent: true });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.position.z = -65; scene.add(ground);
      scene.add(new THREE.HemisphereLight(0xc5ddeb, 0x9b7145, 2.1));
      const sun = new THREE.DirectionalLight(0xffe2ae, 3.1);
      sun.position.set(-30, 22, -35); scene.add(sun);
      scene.fog = new THREE.Fog(0xd5c5aa, 30, 100);
      const starsGeometry = new THREE.BufferGeometry(), stars = [];
      for (let i = 0; i < 150; i++) {
        const n = Math.sin(i * 127.1 + 32.7) * 43758.5453;
        const m = Math.sin(i * 311.7 + 14.3) * 19341.123;
        stars.push((n - Math.floor(n) - 0.5) * 130, 8 + (m - Math.floor(m)) * 45, -85 - i % 35);
      }
      starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
      const starsMaterial = new THREE.PointsMaterial({ color: 0xffeed3, size: 0.10, transparent: true, opacity: 0.65, depthWrite: false, fog: false });
      scene.add(new THREE.Points(starsGeometry, starsMaterial));
      let frame = 0;
      function draw() {
        frame = 0;
        const p = Math.max(0,Math.min(1,window.scrollY/root.offsetHeight));
        root.style.setProperty('--doorway-surround', String(1-smooth(p/0.45)));
        const active = p < 1 && !document.hidden && !motion.matches;
        surfaceRef.current.style.visibility = active ? 'visible' : 'hidden';
        if (!active || disposed) return;
        const flight = smooth(p);
        camera.position.set(0, 3.2, 15 - flight * 66);
        camera.lookAt(0,3.8,camera.position.z-25);
        const reveal = smooth((p-0.12)/0.77);
        const targetTransform = media.style.transform || '';
        background.style.transform = targetTransform;
        background.style.maskImage = `radial-gradient(ellipse, #000 ${45 + reveal * 65}%, transparent ${75 + reveal * 65}%)`;
        backdropRef.current.style.opacity = String(0.18 + reveal * 0.82);
        groundMaterial.opacity = 1-smooth((p-0.55)/0.40);
        starsMaterial.opacity = 0.65 * (1-smooth((p-0.65)/0.30));
        copyRef.current.style.opacity = String(smooth((p-0.65)/0.28));
        const doorway = smooth(p/0.45);
        surfaceRef.current.style.clipPath = `inset(${10*(1-doorway)}% ${34*(1-doorway)}% ${-12-doorway*70}% round ${46*(1-doorway)}% ${46*(1-doorway)}% 0 0)`;
        surfaceRef.current.style.opacity = String(1-smooth((p-0.97)/0.03));
        const width=window.innerWidth,height=window.innerHeight;
        if (canvasRef.current.width !== Math.round(width*renderer.getPixelRatio()) || canvasRef.current.height !== Math.round(height*renderer.getPixelRatio())) {
          renderer.setSize(width,height,false); camera.aspect=width/height; camera.updateProjectionMatrix();
        }
        renderer.render(scene,camera);
        frame=requestAnimationFrame(draw);
      }
      function wake(){ if (!frame && !disposed) frame=requestAnimationFrame(draw); }
      cleanup=()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',wake);window.removeEventListener('resize',wake);document.removeEventListener('visibilitychange',wake);motion.removeEventListener('change',wake);groundGeometry.dispose();groundMaterial.dispose();starsGeometry.dispose();starsMaterial.dispose();renderer.dispose();background.remove();copy?.remove();};
      const image = background.querySelector('img');
      if (image && !image.complete) await new Promise(resolve => { image.onload=resolve;image.onerror=resolve; });
      if (disposed) return;
      root.dataset.ready='true';
      window.addEventListener('scroll',wake,{passive:true});window.addEventListener('resize',wake);
      document.addEventListener('visibilitychange',wake);motion.addEventListener('change',wake);wake();
    }
    const start = hero => initialize(hero).catch(()=>{root.dataset.ready='true';surfaceRef.current.style.visibility='hidden';});
    const hero=document.querySelector('.intro-embedded');
    if(hero) start(hero); else { observer=new MutationObserver(()=>{const found=document.querySelector('.intro-embedded');if(found){observer.disconnect();start(found);}});observer.observe(document.body,{childList:true,subtree:true}); }
    return ()=>{disposed=true;observer?.disconnect();cleanup?.();};
  },[]);
  return <div ref={rootRef} className={styles.opening} data-home-sky data-garden-intro aria-hidden="true">
    <div ref={surfaceRef} className={styles.surface}>
      <div ref={backdropRef} className={styles.backdrop}/>
      <div ref={copyRef} className={styles.copy}/>
      <canvas ref={canvasRef} className={styles.trees}/>
    </div>
  </div>;
}
