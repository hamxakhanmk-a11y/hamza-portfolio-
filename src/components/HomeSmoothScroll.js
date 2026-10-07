'use client';

import { useEffect } from 'react';
import 'lenis/dist/lenis.css';

export default function HomeSmoothScroll() {
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false;
    let instance;
    let frame;

    async function start() {
      if (motion.matches || instance) return;
      const [{ default: Lenis }, scrollModule] = await Promise.all([
        import('lenis'), import('gsap/ScrollTrigger'),
      ]);
      if (disposed || motion.matches || instance) return;
      const ScrollTrigger = scrollModule.ScrollTrigger || scrollModule.default;
      instance = new Lenis({
        lerp: 0.065,
        smoothWheel: true,
        wheelMultiplier: 0.7,
        syncTouch: true,
        syncTouchLerp: 0.065,
        touchMultiplier: 0.85,
        anchors: true,
        prevent: (element) => Boolean(element.closest('[role="dialog"], [data-lenis-prevent]')),
      });
      instance.on('scroll', ScrollTrigger.update);
      const tick = (time) => { instance?.raf(time); frame = requestAnimationFrame(tick); };
      frame = requestAnimationFrame(tick);
    }
    function stop() { cancelAnimationFrame(frame); instance?.destroy(); instance = null; }
    function preferenceChanged() { if (motion.matches) stop(); else start(); }
    start();
    motion.addEventListener('change', preferenceChanged);
    return () => { disposed = true; stop(); motion.removeEventListener('change', preferenceChanged); };
  }, []);
  return null;
}
