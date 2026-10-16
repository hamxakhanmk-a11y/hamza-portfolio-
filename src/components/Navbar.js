'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { label: 'Home', href: '/' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Commissions', href: '/commissions' },
  { label: 'Shows', href: '/shows' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [pendingHref, setPendingHref] = useState(null);
  const [flowing, setFlowing] = useState(false);
  const [flowReady, setFlowReady] = useState(false);
  const pathname = usePathname();
  const navRef = useRef(null);
  const flowTimer = useRef(null);
  const overlayHero = pathname === '/' && !scrolled;
  // null on an address that isn't one of the tabs (the 404 page): then no tab is highlighted
  const currentHref = pendingHref || links.find(({ href }) => (
    href === '/' ? pathname === '/' : pathname.startsWith(href)
  ))?.href || null;

  useEffect(() => {
    const onScroll = () => {
      if (pathname !== '/') {
        setScrolled(window.scrollY > 10);
        return;
      }

      const gallery = document.getElementById('gallery');
      const navHeight = 52;
      setScrolled(Boolean(gallery && gallery.getBoundingClientRect().top <= navHeight));
    };

    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPendingHref(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    const syncIndicators = () => {
      const container = navRef.current;
      const active = container?.querySelector('.nav-flow-link--active');
      if (!active || active.offsetParent === null) return;
      container.style.setProperty('--nav-flow-x', `${active.offsetLeft}px`);
      container.style.setProperty('--nav-flow-w', `${active.offsetWidth}px`);
      // on the narrowest phones the row scrolls sideways: keep the current page's tab in view
      if (container.scrollWidth > container.clientWidth) {
        container.scrollLeft = active.offsetLeft - (container.clientWidth - active.offsetWidth) / 2;
      }
      setFlowReady(true);
    };

    const frame = window.requestAnimationFrame(syncIndicators);
    window.addEventListener('resize', syncIndicators);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', syncIndicators);
    };
  }, [currentHref]);

  useEffect(() => () => {
    window.clearTimeout(flowTimer.current);
  }, []);

  const changePage = (href) => {
    if (href === pathname && !pendingHref) return;

    window.clearTimeout(flowTimer.current);
    setPendingHref(href);
    setFlowing(false);

    window.requestAnimationFrame(() => {
      setFlowing(true);
      flowTimer.current = window.setTimeout(() => setFlowing(false), 320);
    });

  };

  if (pathname.startsWith('/admin')) return null;

  return (
    <header
      className={`navbar-shell fixed top-0 left-0 right-0 z-50 transition-shadow duration-300 ${
        overlayHero
          ? 'navbar-shell--hero text-white'
          : 'navbar-shell--solid text-[#075f8f]'
      } ${
        scrolled || !overlayHero ? 'shadow-sm' : ''
      }`}
    >
      {/* One row of tabs on every screen; on tablets and phones they shrink so all six fit. */}
      <nav
        ref={navRef}
        className={`nav-flow-tabs ${currentHref ? '' : 'nav-flow-tabs--none'} flex justify-between gap-[3px] px-1.5 py-1.5 sm:justify-center sm:gap-2 sm:px-4 lg:gap-4 lg:px-6 ${flowReady ? 'nav-flow-tabs--ready' : ''} ${flowing ? 'is-flowing' : ''}`}
      >
        <span className="nav-flow-indicator" aria-hidden="true" />
        {links.map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            prefetch={true}
            onNavigate={() => changePage(href)}
            aria-current={currentHref === href ? 'page' : undefined}
            className={`nav-flow-link shrink-0 px-[clamp(0.25rem,1.3vw,0.85rem)] py-2 text-[clamp(7.5px,2.1vw,11px)] uppercase tracking-[0.04em] sm:tracking-[0.14em] lg:px-4 lg:text-xs lg:tracking-[0.25em] ${currentHref === href ? 'nav-flow-link--active' : ''}`}
            style={{ color: currentHref === href || overlayHero ? '#fffaf2' : 'var(--color-ocean)' }}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
