'use client';

import { useState } from 'react';

export default function AboutTabs({ bio, statement, bioImages = [], statementImages = [], artistName }) {
  const [tab, setTab] = useState('bio');

  const tabs = [
    { key: 'bio', label: 'Bio', text: bio, images: bioImages },
    { key: 'statement', label: 'Artist Statement', text: statement, images: statementImages },
  ];

  const active = tabs.find(t => t.key === tab);

  return (
    <div className="flex flex-col gap-10">

      {/* Tab buttons */}
      <div className="flex gap-5 border-b border-neutral-200 sm:gap-8">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 pb-3 text-[11px] uppercase tracking-[0.18em] transition-all sm:text-xs sm:tracking-[0.25em] ${
              tab === t.key
                ? 'border-current'
                : 'border-transparent opacity-40 hover:opacity-70'
            }`}
            style={{ color: 'var(--color-ocean)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div key={active.key} className="grid items-start gap-10 md:grid-cols-2 md:gap-14">
        <div className="flex flex-col gap-6">
          {active.images.length === 0 ? (
            <div className="flex aspect-[3/4] items-end bg-neutral-200 p-6">
              <p className="text-xs uppercase tracking-widest text-neutral-400">
                Upload {active.label} photos in Admin → About
              </p>
            </div>
          ) : active.images.map((image, index) => (
            <div key={image.id} className={index === 0 ? '' : 'md:ml-10'}>
              <img
                src={image.image_url}
                alt={`${artistName} — ${active.label} ${index + 1}`}
                className="living-image block h-auto w-full shadow-[0_6px_28px_rgba(0,0,0,0.10)]"
              />
            </div>
          ))}
        </div>

        <div className="text-neutral-600 leading-relaxed whitespace-pre-line lg:sticky lg:top-28">
          {active.text || (
            <span className="text-neutral-300 italic text-sm">
              Add {active.label.toLowerCase()} in Admin → About.
            </span>
          )}
          <a
            href="/contact"
            className="mt-10 block w-fit border-b pb-0.5 text-xs uppercase tracking-[0.2em] transition-colors hover:opacity-50"
            style={{ color: 'var(--color-ocean)', borderColor: 'var(--color-water)' }}
          >
            Get in Touch
          </a>
        </div>
      </div>
    </div>
  );
}
