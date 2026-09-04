'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const overlayHero = pathname === '/' && !scrolled && !open;

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

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-500 ${
        overlayHero
          ? 'bg-gradient-to-b from-[#022d47]/70 via-[#022d47]/22 to-transparent text-white'
          : 'bg-[#fffaf2]/95 text-[#075f8f] backdrop-blur-md'
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
          data-page-transition
          className="max-w-[calc(100%-4rem)] truncate text-lg uppercase tracking-[0.18em] sm:text-xl sm:tracking-[0.3em] md:text-2xl"
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
      <nav className="hidden md:flex justify-center gap-10 py-3 px-6">
        {links.map(({ label, href }) => (
          <a
            key={label}
            href={href}
            data-page-transition
            className="text-xs tracking-[0.25em] uppercase transition-colors hover:opacity-60"
            style={{ color: overlayHero ? '#fffaf2' : 'var(--color-ocean)' }}
          >
            {label}
          </a>
        ))}
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <nav className="flex max-h-[calc(100svh-4rem)] flex-col items-center gap-1 overflow-y-auto border-t border-[#27a8c7]/15 bg-[#fffaf2] py-3 md:hidden">
          {links.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              data-page-transition
              onClick={() => setOpen(false)}
              className="w-full py-3 text-center text-xs uppercase tracking-[0.25em]"
              style={{ color: 'var(--color-ocean)' }}
            >
              {label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
