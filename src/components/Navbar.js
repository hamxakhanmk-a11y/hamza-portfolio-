'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

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
      <div data-hero-scroll-bypass className="relative flex min-h-12 items-center justify-between px-4 sm:px-6 md:hidden">
        <Link
          href="/"
          prefetch={true}
          className="text-xs uppercase tracking-[0.15em]"
        >
          Home
        </Link>

        {/* Mobile hamburger */}
        <button
          className={`absolute right-4 flex h-11 w-11 flex-col items-center justify-center gap-[5px] rounded-full sm:right-6 md:hidden ${
            overlayHero ? 'bg-[#022d47]/35 backdrop-blur-sm' : 'bg-white/80'
          }`}
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span className={`block h-px w-6 transition-all duration-300 ${overlayHero ? 'bg-white' : 'bg-neutral-700'}`}
            style={{ transform: open ? 'rotate(45deg) translate(4px, 4px)' : 'none' }} />
          <span className={`block h-px w-6 transition-all duration-300 ${overlayHero ? 'bg-white' : 'bg-neutral-700'}`}
            style={{ opacity: open ? 0 : 1 }} />
          <span className={`block h-px w-6 transition-all duration-300 ${overlayHero ? 'bg-white' : 'bg-neutral-700'}`}
            style={{ transform: open ? 'rotate(-45deg) translate(4px, -4px)' : 'none' }} />
        </button>
      </div>

      {/* Single-row desktop navigation. */}
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
          className={`nav-flow-tabs nav-flow-tabs--mobile flex max-h-[calc(100svh-3rem)] flex-col items-center gap-1 overflow-x-hidden overflow-y-auto border-t border-[#27a8c7]/15 bg-[#fffaf2] py-3 md:hidden ${flowReady ? 'nav-flow-tabs--ready' : ''} ${flowing ? 'is-flowing' : ''}`}
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
