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
        const phase = x*0.16+z*0.11+Math.sin(z*0.045)*1.7;
        // Unequal slopes and narrow crests create wind-shaped ridges at several depths.
        const ridge = Math.pow(0.5+0.5*Math.sin(phase), 2.8);
        const secondary = Math.pow(0.5+0.5*Math.sin(z*0.23-x*0.09), 3);
        positions.setY(i, side*(0.7+ridge*5.4+secondary*1.6)-0.6);
      }
      groundGeometry.computeVertexNormals();
      const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xdcb28a, roughness: 0.86, transparent: true });
      const sandTime = { value: 0 };
      groundMaterial.onBeforeCompile = shader => {
        shader.uniforms.uSandTime = sandTime;
        shader.vertexShader = 'varying vec3 vSand;\n'+shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvSand=position;');
        shader.fragmentShader = 'varying vec3 vSand;uniform float uSandTime;\n'+shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          float ripple=sin(vSand.x*13.0+vSand.z*3.5+sin(vSand.z*0.8)*1.8);
          float grain=fract(sin(dot(floor(vSand.xz*180.0),vec2(12.9898,78.233)))*43758.5453);
          diffuseColor.rgb*=0.94+0.045*ripple+(grain-0.5)*0.06;
          float sheen=pow(max(0.0,sin(vSand.x*0.24+vSand.z*0.16)),7.0);
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.32,0.70,0.72),sheen*0.10);
          float glint=step(0.997,grain)*pow(max(0.0,sin(uSandTime*1.8+vSand.x*4.0+vSand.z)),18.0);
          diffuseColor.rgb+=vec3(0.40,0.34,0.22)*glint;`);
      };
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.position.z = -65; scene.add(ground);
      scene.add(new THREE.HemisphereLight(0xa5cddd, 0x755542, 1.15));
      const sun = new THREE.DirectionalLight(0xffdfb2, 2.7);
      sun.position.set(-35, 12, -30); scene.add(sun);
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
      // Separate mist volumes drift upward at actual scene depths, retaining parallax.
      const mistGeometry = new THREE.PlaneGeometry(1,1);
      const mistMaterials = [], mistVolumes = [];
      for (let i=0;i<10;i++) {
        const material = new THREE.ShaderMaterial({
          transparent:true, depthWrite:false, side:THREE.DoubleSide,
          uniforms:{uTime:{value:0},uFade:{value:1},uSeed:{value:i*2.73}},
          vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
          fragmentShader:`varying vec2 vUv;uniform float uTime,uFade,uSeed;
            float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
            float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
            float fbm(vec2 p){return noise(p)*0.53+noise(p*2.03)*0.27+noise(p*4.1)*0.13+noise(p*8.2)*0.07;}
            void main(){
              vec2 q=vUv; q.x+=sin(q.y*7.0+uTime*0.22+uSeed)*0.07;
              vec2 flow=vec2(q.x*5.0+uSeed,q.y*5.5-uTime*0.15);
              float n=fbm(flow+vec2(fbm(flow+3.0),fbm(flow-2.0))*1.7);
              float edge=pow(max(0.0,1.0-length((q-vec2(0.5,0.48))*vec2(2.2,1.85))),1.8);
              float density=smoothstep(0.28,0.78,n)*edge;
              vec3 color=mix(vec3(0.53,0.68,0.70),vec3(1.0,0.83,0.59),smoothstep(0.32,0.72,n));
              float sparkle=pow(max(0.0,sin(q.x*85.0+q.y*64.0+uTime*0.7+uSeed)),32.0)*0.07;
              gl_FragColor=vec4(color+sparkle,density*0.48*uFade);
              #include <colorspace_fragment>
            }`,
        });
        const plume=new THREE.Mesh(mistGeometry,material);
        const side=i%2===0?-1:1;
        plume.position.set(side*(9+(i%3)*3),6+(i%3)*2,-8-i*7);
        plume.scale.set(15+(i%3)*3,18+(i%3)*4,1);
        scene.add(plume); mistMaterials.push(material);mistVolumes.push(plume);
      }
      const started=performance.now();
      let frame = 0;
      function draw() {
        frame = 0;
        const p = Math.max(0,Math.min(1,window.scrollY/root.offsetHeight));
        // The wall around the portal stays opaque until the scene fills the screen.
        root.style.setProperty('--doorway-surround', p < 1 ? '1' : '0');
        const active = p < 1 && !document.hidden && !motion.matches;
        surfaceRef.current.style.visibility = active ? 'visible' : 'hidden';
        if (!active || disposed) return;
        const flight = smooth(p);
        const time=(performance.now()-started)/1000;
        sandTime.value=time;
        for(let i=0;i<mistVolumes.length;i++) {
          const plume=mistVolumes[i];
          plume.material.uniforms.uTime.value=time;
          plume.material.uniforms.uFade.value=1-smooth((p-0.72)/0.24);
          plume.position.y=6+(i%3)*2+Math.sin(time*0.17+i)*0.65;
          plume.quaternion.copy(camera.quaternion);
        }
        const lift = smooth((p-0.55)/0.40);
        camera.position.set(Math.sin(flight*Math.PI)*0.7, 3.2+lift*1.2, 15-flight*66);
        camera.lookAt(0,3.8+lift*4.2,camera.position.z-25);
        const reveal = smooth((p-0.12)/0.77);
        const targetTransform = media.style.transform || '';
        // Perspective growth follows the same forward travel as the dunes.
        // At arrival scale and position match the real hero exactly.
        const approach = 0.48 / (1-0.52*flight);
        background.style.transform = targetTransform + ` scale(${approach})`;
        background.style.transformOrigin = '50% 46%';
        const edge = 18*(1-smooth((p-0.86)/0.10));
        background.style.maskImage = `radial-gradient(ellipse, #000 ${25+reveal*105}%, transparent ${65+reveal*100}%), linear-gradient(90deg, transparent, #000 ${edge}%, #000 ${100-edge}%, transparent), linear-gradient(0deg, transparent, #000 ${edge}%, #000 ${100-edge}%, transparent)`;
        background.style.maskComposite = 'intersect';
        backdropRef.current.style.opacity = String(0.65+reveal*0.35);
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
      cleanup=()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',wake);window.removeEventListener('resize',wake);document.removeEventListener('visibilitychange',wake);motion.removeEventListener('change',wake);groundGeometry.dispose();groundMaterial.dispose();starsGeometry.dispose();starsMaterial.dispose();mistGeometry.dispose();mistMaterials.forEach(material=>material.dispose());renderer.dispose();background.remove();copy?.remove();};
      const image = background.querySelector('img');
      if (image && !image.complete) await new Promise(resolve => { image.onload=resolve;image.onerror=resolve; });
      if (disposed) return;
      root.dataset.ready='true';
      window.addEventListener('scroll',wake,{passive:true});window.addEventListener('resize',wake);
      document.addEventListener('visibilitychange',wake);motion.addEventListener('change',wake);wake();
    }
    const start = hero => initialize(hero).catch(()=>{if(disposed) return;cleanup?.();root.dataset.ready='true';root.style.setProperty('--doorway-surround','0');surfaceRef.current.style.visibility='hidden';});
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
