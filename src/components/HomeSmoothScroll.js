'use client';

import { useEffect } from 'react';
import 'lenis/dist/lenis.css';

export default function HomeSmoothScroll() {
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false;
    let instance;
    let frame;
    let introPending = window.scrollY < 80;
    let introRunning = false;
    let readyAt;

    async function start() {
      if (motion.matches || instance) return;
      const [{ default: Lenis }, scrollModule] = await Promise.all([
        import('lenis'), import('gsap/ScrollTrigger'),
      ]);
      if (disposed || motion.matches || instance) return;
      const ScrollTrigger = scrollModule.ScrollTrigger || scrollModule.default;
      instance = new Lenis({
        lerp: 0.22,
        smoothWheel: true,
        wheelMultiplier: 1.15,
        syncTouch: false,
        touchMultiplier: 1,
        anchors: true,
        prevent: (element) => Boolean(element.closest('[role="dialog"], [data-lenis-prevent]')),
      });
      instance.on('scroll', ScrollTrigger.update);
      if (introPending) instance.stop();
      const tick = (time) => {
        instance?.raf(time);
        const sky = document.querySelector('[data-home-sky]');
        if (introPending && sky?.dataset.ready === 'true') {
          readyAt ??= time;
          if (time - readyAt > 250) {
            introPending = false;
            introRunning = true;
            instance.scrollTo(sky.offsetTop + sky.offsetHeight, {
              duration: 3.6,
              force: true,
              lock: true,
              easing: (t) => t * t * (3 - 2 * t),
              onComplete: () => { introRunning = false; instance?.start(); },
            });
          }
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }
    function stop() { cancelAnimationFrame(frame); instance?.destroy(); instance = null; }
    function takeOver(event) {
      if (event.type === 'keydown' && !['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) return;
      if (!motion.matches && (introPending || introRunning)) event.preventDefault();
    }
    function preferenceChanged() { if (motion.matches) stop(); else start(); }
    start();
    motion.addEventListener('change', preferenceChanged);
    window.addEventListener('wheel', takeOver, { passive: false });
    window.addEventListener('touchmove', takeOver, { passive: false });
    window.addEventListener('keydown', takeOver);
    return () => {
      disposed = true; stop(); motion.removeEventListener('change', preferenceChanged);
      window.removeEventListener('wheel', takeOver);
      window.removeEventListener('touchmove', takeOver);
      window.removeEventListener('keydown', takeOver);
    };
  }, []);
  return null;
}
