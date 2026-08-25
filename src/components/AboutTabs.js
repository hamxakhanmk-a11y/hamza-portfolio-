'use client';

import { useState } from 'react';

export default function AboutTabs({ bio, statement }) {
  const [tab, setTab] = useState('bio');

  const tabs = [
    { key: 'bio', label: 'Bio', text: bio },
    { key: 'statement', label: 'Artist Statement', text: statement },
  ];

  const active = tabs.find(t => t.key === tab);

  return (
    <div className="flex flex-col gap-8">

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

      {/* Content */}
      <div className="text-neutral-600 leading-relaxed whitespace-pre-line">
        {active.text || (
          <span className="text-neutral-300 italic text-sm">
            Add {active.label.toLowerCase()} in Admin → About.
          </span>
        )}
      </div>
    </div>
  );
}
