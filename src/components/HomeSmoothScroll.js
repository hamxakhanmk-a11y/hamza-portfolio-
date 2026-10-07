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
        lerp: 0.12,
        smoothWheel: true,
        wheelMultiplier: 1,
        syncTouch: false,
        touchMultiplier: 1,
        anchors: true,
        prevent: (element) => Boolean(element.closest('[role="dialog"], [data-lenis-prevent]')),
      });
      instance.on('scroll', ScrollTrigger.update);
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
              easing: (t) => t * t * (3 - 2 * t),
              onComplete: () => { introRunning = false; },
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
      introPending = false;
      if (introRunning && instance) instance.scrollTo(instance.scroll, { immediate: true });
      introRunning = false;
    }
    function preferenceChanged() { if (motion.matches) stop(); else start(); }
    start();
    motion.addEventListener('change', preferenceChanged);
    window.addEventListener('wheel', takeOver, { passive: true });
    window.addEventListener('touchstart', takeOver, { passive: true });
    window.addEventListener('keydown', takeOver);
    return () => {
      disposed = true; stop(); motion.removeEventListener('change', preferenceChanged);
      window.removeEventListener('wheel', takeOver);
      window.removeEventListener('touchstart', takeOver);
      window.removeEventListener('keydown', takeOver);
    };
  }, []);
  return null;
}
