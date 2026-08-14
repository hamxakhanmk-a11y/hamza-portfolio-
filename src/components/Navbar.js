'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { siteConfig } from '@/data/config';

const links = [
  { label: 'Home', href: '/' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Blog', href: '/blog' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-white transition-shadow duration-300 ${
        scrolled ? 'shadow-sm' : ''
      }`}
    >
      {/* Top row — artist name */}
      <div className="border-b border-neutral-100 py-4 px-6 flex items-center justify-between md:justify-center relative">
        <Link
          href="/"
          className="text-xl md:text-2xl tracking-[0.3em] uppercase"
          style={{ fontFamily: 'var(--font-cormorant)', color: '#3d6478' }}
        >
          {siteConfig.artistName}
        </Link>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-[5px] absolute right-6"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <span className="block w-6 h-px bg-neutral-700 transition-all duration-300"
            style={{ transform: open ? 'rotate(45deg) translate(4px, 4px)' : 'none' }} />
          <span className="block w-6 h-px bg-neutral-700 transition-all duration-300"
            style={{ opacity: open ? 0 : 1 }} />
          <span className="block w-6 h-px bg-neutral-700 transition-all duration-300"
            style={{ transform: open ? 'rotate(-45deg) translate(4px, -4px)' : 'none' }} />
        </button>
      </div>

      {/* Bottom row — nav links (desktop) */}
      <nav className="hidden md:flex justify-center gap-10 py-3 px-6">
        {links.map(({ label, href }) => (
          <a
            key={label}
            href={href}
            className="text-xs tracking-[0.25em] uppercase transition-colors hover:opacity-60"
            style={{ color: '#3d6478' }}
          >
            {label}
          </a>
        ))}
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <nav className="md:hidden bg-white border-t border-neutral-100 flex flex-col items-center gap-6 py-8">
          {links.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              className="text-xs tracking-[0.25em] uppercase"
              style={{ color: '#3d6478' }}
            >
              {label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
