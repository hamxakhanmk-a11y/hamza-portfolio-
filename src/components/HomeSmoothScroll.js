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
    // The "Enter the Collection" button asks for a quicker glide that visibly starts moving at once, so a
    // visitor who clicks sees it respond; scrolling past the last stage keeps the slow cinematic descent.
    let quickDescent = false;
    const descend = (quick = quickDescent) => {
      const gallery = document.getElementById('gallery-tour');
      quickDescent = quick;
      if (!instance || busy) return;
      if (!gallery) { instance.scrollTo(document.getElementById('gallery') || bounds()?.end + window.innerHeight, { duration: 1.5 }); return; }
      if (gallery.dataset.ready !== 'true') { waitingForGallery = true; return; }
      waitingForGallery = false;
      busy = true;
      quickDescent = false;
      instance.scrollTo(window.scrollY + gallery.getBoundingClientRect().top + window.innerHeight * HOME_DESCENT_SVH / 100, {
        duration: quick ? 4.5 : 8, lock: true, force: true,
        easing: quick ? (t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)) : (t => t * t * t * (t * (t * 6 - 15) + 10)),
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
        duration: 0.8, lock: true, force: true,
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
    // Once scrolling stops the gallery picks the painting to land on and asks for the page position to
    // match it; the camera then steers onto it smoothly (see GalleryTour).
    const land = event => {
      if (busy || waitingForGallery) return;
      if (instance) instance.scrollTo(event.detail.y, { immediate: true, force: true });
      else window.scrollTo({ top: event.detail.y, behavior: 'instant' });
    };
    // The gallery's ending glides to its end by itself, then slips the page to the collection under the white.
    const ending = event => {
      if (!instance) { window.dispatchEvent(new Event('gallery-ending-done')); return; }
      instance.scrollTo(event.detail.y, {
        duration: event.detail.duration, lock: true, force: true,
        easing: t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
        onComplete: () => window.dispatchEvent(new Event('gallery-ending-done')),
      });
    };
    const endingJump = event => {
      if (instance) instance.scrollTo(event.detail.y, { immediate: true, force: true });
      else window.scrollTo({ top: event.detail.y, behavior: 'instant' });
    };
    const touchStart = event => { touchY = event.touches[0]?.clientY; touchHandled = false; };
    const touchMove = event => {
      if (splashing()) { consume(event); return; }
      const y = event.touches[0]?.clientY;
      const range = bounds();
      if (touchHandled && range && window.scrollY <= range.end + 2) { consume(event); return; }
      if (touchY == null || y == null) return;
      // Inside the banner, hold the browser's own scrolling back from the very first touch until the swipe's
      // direction is clear; otherwise it starts scrolling first and the stage step adds to it (two stages at
      // once on shorter phones). Pulling down at the very top is left alone (pull-to-refresh).
      const inHero = range && !motion.matches && window.scrollY >= range.start - 2 && window.scrollY <= range.end + 2;
      if (Math.abs(touchY - y) < 12) {
        if (inHero && !(touchY - y < 0 && window.scrollY <= range.start + 2)) consume(event);
        return;
      }
      navigate(Math.sign(touchY - y), event);
      touchHandled = event.defaultPrevented;
      touchY = y;
    };
    const enter = event => {
      if (event.target.closest('a[href="#gallery-tour"]') && !motion.matches) {
        consume(event); descend(true);
      }
    };
    async function start() {
      const [{ default: Lenis }, module] = await Promise.all([import('lenis'), import('gsap/ScrollTrigger')]);
      if (disposed) return;
      const ScrollTrigger = module.ScrollTrigger || module.default;
      instance = new Lenis({ lerp: 0.1, smoothWheel: !motion.matches, wheelMultiplier: 1.1, syncTouch: false, anchors: true,
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
    window.addEventListener('gallery-land', land);
    window.addEventListener('gallery-ending', ending);
    window.addEventListener('gallery-ending-jump', endingJump);
    start();
    return () => {
      disposed = true; cancelAnimationFrame(frame); instance?.destroy();
      window.removeEventListener('wheel', wheel, true);
      window.removeEventListener('keydown', key, true);
      window.removeEventListener('touchstart', touchStart, true);
      window.removeEventListener('touchmove', touchMove, true);
      window.removeEventListener('click', enter, true);
      window.removeEventListener('gallery-land', land);
      window.removeEventListener('gallery-ending', ending);
      window.removeEventListener('gallery-ending-jump', endingJump);
    };
  }, []);
  return null;
}
