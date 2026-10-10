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
      const texture = await new THREE.TextureLoader().loadAsync('/garden-intro/ocean-tree.webp');
      if (disposed) { texture.dispose(); renderer.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      const geometry = new THREE.PlaneGeometry(1, 1);
      const materials = [], trees = [];
      // Flat cutouts occupy real depth: near trees pass quickly; distant trees recede slowly.
      for (const [x,z,height,flip,tint] of [[-4.7,3,8.8,1,0xffffff],[4.9,0,8.3,-1,0xf7f1e4],[-4.8,-7,7.2,-1,0xcfe9ea],[5.2,-13,7.4,1,0xe1f0ed],[-5.6,-21,6.8,1,0xc0dfe5],[5.8,-28,6.6,-1,0xd0e4e6],[-6.5,-36,6,-1,0xbcdce4],[6.8,-42,6,1,0xc6e1e6]]) {
        const material = new THREE.MeshBasicMaterial({ map: texture, color: tint, transparent: true, alphaTest: 0.035, depthWrite: true, toneMapped: false });
        materials.push(material);
        const tree = new THREE.Mesh(geometry, material);
        tree.scale.set(height * texture.image.width / texture.image.height * flip, height, 1);
        tree.position.set(x,height/2,z);
        scene.add(tree); trees.push(tree);
      }
      const groundGeometry = new THREE.PlaneGeometry(160,160);
      const groundMaterial = new THREE.ShaderMaterial({
        uniforms: { uFade: { value: 1 } }, transparent: true, depthWrite: false, toneMapped: false,
        vertexShader: `varying vec3 vGround; void main(){vGround=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vGround,1.0);}`,
        fragmentShader: `varying vec3 vGround;uniform float uFade;
          void main(){
            float dune=sin(vGround.x*0.35+sin(vGround.z*0.18)*1.4)*0.5+0.5;
            float grain=fract(sin(dot(floor(vGround.xz*140.0),vec2(12.98,78.23)))*43758.54);
            vec3 sand=mix(vec3(0.66,0.63,0.51),vec3(0.88,0.84,0.70),dune*0.65+0.25);
            sand+=(grain-0.5)*0.025;
            float horizon=smoothstep(-60.0,-8.0,vGround.z);
            gl_FragColor=vec4(sand,uFade*horizon);
            #include <colorspace_fragment>
          }`,
      });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI/2; ground.position.set(0,-0.04,-40); scene.add(ground);
      let frame = 0;
      function draw() {
        frame = 0;
        const p = Math.max(0,Math.min(1,window.scrollY/root.offsetHeight));
        const active = p < 1 && !document.hidden && !motion.matches;
        surfaceRef.current.style.visibility = active ? 'visible' : 'hidden';
        if (!active || disposed) return;
        const flight = smooth(p);
        camera.position.set(0, 2.1, 15 - flight * 66);
        camera.lookAt(0,2.15,camera.position.z-20);
        const reveal = smooth((p-0.12)/0.77);
        const targetTransform = media.style.transform || '';
        background.style.transform = targetTransform;
        background.style.maskImage = `radial-gradient(ellipse, #000 ${45 + reveal * 65}%, transparent ${75 + reveal * 65}%)`;
        backdropRef.current.style.opacity = String(0.42 + reveal * 0.58);
        groundMaterial.uniforms.uFade.value = 1-smooth((p-0.20)/0.50);
        for (const tree of trees) tree.material.opacity = 1-smooth((p-0.83)/0.15);
        copyRef.current.style.opacity = String(smooth((p-0.12)/0.25));
        surfaceRef.current.style.clipPath = `ellipse(${48+smooth(p/0.27)*105}% ${58+smooth(p/0.27)*100}% at 50% 55%)`;
        surfaceRef.current.style.opacity = String(1-smooth((p-0.97)/0.03));
        const width=window.innerWidth,height=window.innerHeight;
        if (canvasRef.current.width !== Math.round(width*renderer.getPixelRatio()) || canvasRef.current.height !== Math.round(height*renderer.getPixelRatio())) {
          renderer.setSize(width,height,false); camera.aspect=width/height; camera.updateProjectionMatrix();
        }
        renderer.render(scene,camera);
        frame=requestAnimationFrame(draw);
      }
      function wake(){ if (!frame && !disposed) frame=requestAnimationFrame(draw); }
      cleanup=()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',wake);window.removeEventListener('resize',wake);document.removeEventListener('visibilitychange',wake);motion.removeEventListener('change',wake);geometry.dispose();groundGeometry.dispose();groundMaterial.dispose();materials.forEach(m=>m.dispose());texture.dispose();renderer.dispose();background.remove();copy?.remove();};
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
