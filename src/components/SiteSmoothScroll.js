'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import 'lenis/dist/lenis.css';

// Smooth wheel scrolling on every page except Home (which has its own, with the hero stages and the
// gallery) and the admin. Phones keep their own native touch scrolling, which is already smooth.
export default function SiteSmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/' || pathname.startsWith('/admin')) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let instance, frame, disposed = false;
    (async () => {
      const [{ default: Lenis }, module] = await Promise.all([import('lenis'), import('gsap/ScrollTrigger')]);
      if (disposed) return;
      const ScrollTrigger = module.ScrollTrigger || module.default;
      instance = new Lenis({
        lerp: 0.1, wheelMultiplier: 1.1, smoothWheel: true, syncTouch: false, anchors: true,
        prevent: element => Boolean(element.closest('[role="dialog"], [data-lenis-prevent]')),
      });
      instance.on('scroll', ScrollTrigger.update);
      const tick = time => { instance.raf(time); frame = requestAnimationFrame(tick); };
      frame = requestAnimationFrame(tick);
    })();
    return () => { disposed = true; cancelAnimationFrame(frame); instance?.destroy(); };
  }, [pathname]);

  return null;
}
