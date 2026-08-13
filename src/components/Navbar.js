'use client';

import { useState } from "react";
import { siteConfig } from "@/data/config";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const links = [
    ["Gallery", "#gallery"],
    ["About", "#about"],
    ["Contact", "#contact"],
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-neutral-100">
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a
          href="#"
          className="text-lg tracking-[0.25em] uppercase"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          {siteConfig.artistName}
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-10">
          {links.map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="text-xs tracking-[0.2em] uppercase text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              {label}
            </a>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-[5px] p-1"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <span
            className="block w-6 h-px bg-neutral-900 transition-all duration-300"
            style={{ transform: open ? "rotate(45deg) translate(4px, 4px)" : "none" }}
          />
          <span
            className="block w-6 h-px bg-neutral-900 transition-all duration-300"
            style={{ opacity: open ? 0 : 1 }}
          />
          <span
            className="block w-6 h-px bg-neutral-900 transition-all duration-300"
            style={{ transform: open ? "rotate(-45deg) translate(4px, -4px)" : "none" }}
          />
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-neutral-100 px-6 py-8 flex flex-col gap-7">
          {links.map(([label, href]) => (
            <a
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              className="text-xs tracking-[0.2em] uppercase text-neutral-600"
            >
              {label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
