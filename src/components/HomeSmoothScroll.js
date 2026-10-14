'use client';

import { useEffect } from 'react';
import 'lenis/dist/lenis.css';
import { HOME_DESCENT_SVH } from '@/data/galleryTour';

export default function HomeSmoothScroll() {
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false, instance, frame;
    let busy = false, landing = false, waitingForGallery = false, lastWheel = -Infinity, releaseAt = 0;
    let touchY = null, touchHandled = false;
    const bounds = () => {
      const element = document.querySelector('[data-hero-stages]');
      if (!element) return null;
      const start = window.scrollY + element.getBoundingClientRect().top;
      return { start, end: start + element.offsetHeight - window.innerHeight };
    };
    const consume = event => { event.preventDefault(); event.stopImmediatePropagation(); };
    const splashing = () => Boolean(document.documentElement.dataset.splash); // the opening is still playing
    const descend = () => {
      const gallery = document.getElementById('gallery-tour');
      if (!instance || busy) return;
      if (!gallery) { instance.scrollTo(document.getElementById('gallery') || bounds()?.end + window.innerHeight, { duration: 1.5 }); return; }
      if (gallery.dataset.ready !== 'true') { waitingForGallery = true; return; }
      waitingForGallery = false;
      busy = true;
      instance.scrollTo(window.scrollY + gallery.getBoundingClientRect().top + window.innerHeight * HOME_DESCENT_SVH / 100, {
        duration: 8, lock: true, force: true,
        easing: t => t * t * t * (t * (t * 6 - 15) + 10),
        onComplete: () => { landing = true; },
      });
    };
    const navigate = (direction, event) => {
      if (!instance || motion.matches) return;
      const range = bounds();
      if (!range) return;
      if (busy || waitingForGallery) { consume(event); return; }
      const y = window.scrollY;
      if (y < range.start - 2 || y > range.end + 2) return;
      const stage = Math.round((y - range.start) / Math.max(1, range.end - range.start) * 3);
      if (direction < 0 && stage === 0) return;
      consume(event);
      if (performance.now() < releaseAt) return;
      if (direction > 0 && stage === 3) { descend(); return; }
      busy = true;
      instance.scrollTo(range.start + Math.min(3, Math.max(0, stage + direction)) * (range.end - range.start) / 3, {
        duration: 1.15, lock: true, force: true,
        easing: t => t * t * (3 - 2 * t),
        onComplete: () => { busy = false; releaseAt = performance.now() + 180; },
      });
    };
    const wheel = event => {
      if (splashing()) { consume(event); return; }
      if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const now = performance.now(), gap = now - lastWheel;
      lastWheel = now;
      const range = bounds();
      if (!motion.matches && (busy || waitingForGallery || (range && window.scrollY <= range.end + 2 && window.scrollY >= range.start - 2 && gap < 180))) {
        consume(event); return;
      }
      navigate(Math.sign(event.deltaY), event);
    };
    const key = event => {
      if (splashing()) { consume(event); return; }
      if (event.target.closest('input, textarea, select, [contenteditable="true"]') || event.altKey || event.ctrlKey || event.metaKey) return;
      const direction = ['ArrowDown', 'PageDown', ' '].includes(event.key) ? (event.shiftKey ? -1 : 1) : ['ArrowUp', 'PageUp'].includes(event.key) ? -1 : 0;
      if (direction) navigate(direction, event);
    };
    const touchStart = event => { touchY = event.touches[0]?.clientY; touchHandled = false; };
    const touchMove = event => {
      if (splashing()) { consume(event); return; }
      const y = event.touches[0]?.clientY;
      const range = bounds();
      if (touchHandled && range && window.scrollY <= range.end + 2) { consume(event); return; }
      if (touchY == null || y == null || Math.abs(touchY - y) < 20) return;
      navigate(Math.sign(touchY - y), event);
      touchHandled = event.defaultPrevented;
      touchY = y;
    };
    const enter = event => {
      if (event.target.closest('a[href="#gallery-tour"]') && !motion.matches) {
        consume(event); descend();
      }
    };
    async function start() {
      const [{ default: Lenis }, module] = await Promise.all([import('lenis'), import('gsap/ScrollTrigger')]);
      if (disposed) return;
      const ScrollTrigger = module.ScrollTrigger || module.default;
      instance = new Lenis({ lerp: 0.22, smoothWheel: !motion.matches, wheelMultiplier: 1.15, syncTouch: false, anchors: true,
        prevent: element => Boolean(element.closest('[role="dialog"], [data-lenis-prevent]')) });
      instance.on('scroll', ScrollTrigger.update);
      const tick = time => {
        instance.raf(time);
        if (waitingForGallery && document.getElementById('gallery-tour')?.dataset.ready !== 'false') {
          waitingForGallery = false; descend();
        }
        if (landing && Number(document.getElementById('gallery-tour')?.dataset.descent) >= 0.999) {
          landing = false; busy = false; releaseAt = performance.now() + 180;
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }
    window.addEventListener('wheel', wheel, { passive: false, capture: true });
    window.addEventListener('keydown', key, true);
    window.addEventListener('touchstart', touchStart, { passive: true, capture: true });
    window.addEventListener('touchmove', touchMove, { passive: false, capture: true });
    window.addEventListener('click', enter, true);
    start();
    return () => {
      disposed = true; cancelAnimationFrame(frame); instance?.destroy();
      window.removeEventListener('wheel', wheel, true);
      window.removeEventListener('keydown', key, true);
      window.removeEventListener('touchstart', touchStart, true);
      window.removeEventListener('touchmove', touchMove, true);
      window.removeEventListener('click', enter, true);
    };
  }, []);
  return null;
}
