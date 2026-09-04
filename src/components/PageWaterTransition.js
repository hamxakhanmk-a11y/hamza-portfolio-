'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const COVER_TIME = 420;
const REVEAL_DELAY = 90;
const REVEAL_TIME = 620;

export default function PageWaterTransition() {
  const pathname = usePathname();
  const router = useRouter();
  const [phase, setPhase] = useState('idle');
  const pendingRoute = useRef(null);
  const timers = useRef([]);

  const schedule = (callback, delay) => {
    const timer = window.setTimeout(callback, delay);
    timers.current.push(timer);
    return timer;
  };

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  useEffect(() => {
    if (!pendingRoute.current || pathname !== pendingRoute.current) return;

    schedule(() => setPhase('reveal'), REVEAL_DELAY);
    schedule(() => {
      setPhase('idle');
      pendingRoute.current = null;
    }, REVEAL_DELAY + REVEAL_TIME);
  }, [pathname]);

  useEffect(() => {
    const onNavigate = (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        phase !== 'idle' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) return;

      const link = event.target.closest('[data-page-transition]');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;

      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === pathname) return;

      event.preventDefault();
      pendingRoute.current = url.pathname;
      setPhase('cover');

      schedule(() => {
        router.push(`${url.pathname}${url.search}${url.hash}`);
      }, COVER_TIME);

      // Never leave the page covered if a network/navigation error prevents the route change.
      schedule(() => {
        if (pendingRoute.current) {
          setPhase('reveal');
          schedule(() => {
            setPhase('idle');
            pendingRoute.current = null;
          }, REVEAL_TIME);
        }
      }, COVER_TIME + 1200);
    };

    document.addEventListener('click', onNavigate, true);
    return () => document.removeEventListener('click', onNavigate, true);
  }, [pathname, phase, router]);

  return (
    <div className={`page-water-transition page-water-transition--${phase}`} aria-hidden="true">
      <span className="page-water-transition__depth" />
      <span className="page-water-transition__flow page-water-transition__flow--one" />
      <span className="page-water-transition__flow page-water-transition__flow--two" />
      <span className="page-water-transition__glow" />
    </div>
  );
}
