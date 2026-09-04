'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { siteConfig } from '@/data/config';

const links = [
  { label: 'Home', href: '/' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Commissions', href: '/commissions' },
  { label: 'Shows', href: '/shows' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pendingHref, setPendingHref] = useState(null);
  const [flowing, setFlowing] = useState(false);
  const [flowReady, setFlowReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const desktopNavRef = useRef(null);
  const mobileNavRef = useRef(null);
  const flowTimer = useRef(null);
  const overlayHero = pathname === '/' && !scrolled && !open;
  const currentHref = pendingHref || links.find(({ href }) => (
    href === '/' ? pathname === '/' : pathname.startsWith(href)
  ))?.href || '/';

  useEffect(() => {
    const onScroll = () => {
      if (pathname !== '/') {
        setScrolled(window.scrollY > 10);
        return;
      }

      const gallery = document.getElementById('gallery');
      const navHeight = 132;
      setScrolled(Boolean(gallery && gallery.getBoundingClientRect().top <= navHeight));
    };

    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPendingHref(null);
      setOpen(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    const positionIndicator = (container, mobile = false) => {
      if (!container) return false;
      const active = container.querySelector('.nav-flow-link--active');
      if (!active || active.offsetParent === null) return false;

      if (mobile) {
        container.style.setProperty('--nav-flow-y', `${active.offsetTop}px`);
        container.style.setProperty('--nav-flow-h', `${active.offsetHeight}px`);
      } else {
        container.style.setProperty('--nav-flow-x', `${active.offsetLeft}px`);
        container.style.setProperty('--nav-flow-w', `${active.offsetWidth}px`);
      }
      return true;
    };

    const syncIndicators = () => {
      const positioned = positionIndicator(desktopNavRef.current);
      const positionedMobile = positionIndicator(mobileNavRef.current, true);
      if (positioned || positionedMobile) setFlowReady(true);
    };

    const frame = window.requestAnimationFrame(syncIndicators);
    window.addEventListener('resize', syncIndicators);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', syncIndicators);
    };
  }, [currentHref, open]);

  useEffect(() => () => {
    window.clearTimeout(flowTimer.current);
  }, []);

  const changePage = (event, href) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (href === currentHref && !pendingHref) return;

    window.clearTimeout(flowTimer.current);
    setPendingHref(href);
    setFlowing(false);

    window.requestAnimationFrame(() => {
      setFlowing(true);
      flowTimer.current = window.setTimeout(() => setFlowing(false), 1120);
    });

    router.push(href);
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
      {/* Top row — artist name */}
      <div className={`relative flex min-h-16 items-center justify-between border-b px-4 py-3 sm:px-6 md:justify-center ${
        overlayHero ? 'border-white/20' : 'border-neutral-100'
      }`}>
        <Link
          href="/"
          prefetch={true}
          className="max-w-[calc(100%-4rem)] truncate text-lg uppercase tracking-[0.18em] transition-colors duration-300 sm:text-xl sm:tracking-[0.3em] md:text-2xl"
          style={{ fontFamily: 'var(--font-cormorant)', color: overlayHero ? '#fffaf2' : 'var(--color-ocean)' }}
        >
          {siteConfig.artistName}
        </Link>

        {/* Mobile hamburger */}
        <button
          className="absolute right-4 flex h-11 w-11 flex-col items-center justify-center gap-[5px] sm:right-6 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <span className={`block h-px w-6 transition-all duration-300 ${overlayHero ? 'bg-white' : 'bg-neutral-700'}`}
            style={{ transform: open ? 'rotate(45deg) translate(4px, 4px)' : 'none' }} />
          <span className={`block h-px w-6 transition-all duration-300 ${overlayHero ? 'bg-white' : 'bg-neutral-700'}`}
            style={{ opacity: open ? 0 : 1 }} />
          <span className={`block h-px w-6 transition-all duration-300 ${overlayHero ? 'bg-white' : 'bg-neutral-700'}`}
            style={{ transform: open ? 'rotate(-45deg) translate(4px, -4px)' : 'none' }} />
        </button>
      </div>

      {/* Bottom row — nav links (desktop) */}
      <nav
        ref={desktopNavRef}
        className={`nav-flow-tabs hidden md:flex justify-center gap-4 py-1.5 px-6 ${flowReady ? 'nav-flow-tabs--ready' : ''} ${flowing ? 'is-flowing' : ''}`}
      >
        <span className="nav-flow-indicator" aria-hidden="true" />
        {links.map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            prefetch={true}
            onClick={(event) => changePage(event, href)}
            aria-current={currentHref === href ? 'page' : undefined}
            className={`nav-flow-link px-4 py-2 text-xs tracking-[0.25em] uppercase ${currentHref === href ? 'nav-flow-link--active' : ''}`}
            style={{ color: currentHref === href || overlayHero ? '#fffaf2' : 'var(--color-ocean)' }}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <nav
          ref={mobileNavRef}
          className={`nav-flow-tabs nav-flow-tabs--mobile flex max-h-[calc(100svh-4rem)] flex-col items-center gap-1 overflow-y-auto border-t border-[#27a8c7]/15 bg-[#fffaf2] py-3 md:hidden ${flowReady ? 'nav-flow-tabs--ready' : ''} ${flowing ? 'is-flowing' : ''}`}
        >
          <span className="nav-flow-indicator" aria-hidden="true" />
          {links.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              prefetch={true}
              onClick={(event) => changePage(event, href)}
              aria-current={currentHref === href ? 'page' : undefined}
              className={`nav-flow-link w-full py-3 text-center text-xs uppercase tracking-[0.25em] ${currentHref === href ? 'nav-flow-link--active' : ''}`}
              style={{ color: currentHref === href ? '#fffaf2' : 'var(--color-ocean)' }}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
