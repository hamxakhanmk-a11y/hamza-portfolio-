'use client';

import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isHistoryTraversal, rememberPosition, savedPosition } from '@/lib/scrollHistory';

// Set once the visitor scrolls with their own input (wheel, touch, keys), so an early scroll on a
// fresh load is kept rather than snapped back to the top when the page finishes loading.
let visitorScrolled = false;
let lastPath = null; // the page the reset last ran for
if (typeof window !== 'undefined') {
  const mark = () => { visitorScrolled = true; };
  for (const type of ['wheel', 'touchmove', 'keydown']) window.addEventListener(type, mark, { passive: true, once: true });
  window.addEventListener('scroll', () => { if (lastPath) rememberPosition(lastPath, window.scrollY); }, { passive: true });
}

// Tall pages may still be growing when they first render, so keep trying for a moment.
function restore(y) {
  let tries = 0;
  const step = () => {
    window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    if (Math.abs(window.scrollY - y) > 2 && ++tries < 90) requestAnimationFrame(step);
  };
  step();
}

export default function PageScrollReset() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    // a repeat run for the same page (React re-running effects) counts as the same load
    const isFirstLoad = lastPath === null || lastPath === pathname;
    lastPath = pathname;
    if (pathname.startsWith('/admin') || window.location.hash) return;
    // Back/Forward: return to where the visitor was on this page
    if (!isFirstLoad && isHistoryTraversal()) {
      restore(savedPosition(pathname) ?? 0);
      return;
    }
    // on a fresh load or refresh, only reset if the visitor hasn't started scrolling yet
    if (isFirstLoad && visitorScrolled) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
