'use client';

import { useRef, useState } from 'react';
import HeroMedia from '@/components/HeroMedia';

const STAGES = [
  { number: 1, note: 'Opening full-painting view' },
  { number: 2, note: 'First detail view' },
  { number: 3, note: 'Second detail view' },
  { number: 4, note: 'Final full-painting view' },
];

function numberValue(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function HeroTextEditor({ image, values, defaults, onChange, onSave, saving, message }) {
  const [stage, setStage] = useState(1);
  const [dragging, setDragging] = useState(false);
  const previewRef = useRef(null);
  const prefix = `hero_stage_${stage}`;
  const eyebrow = values[`${prefix}_eyebrow`] ?? defaults[`${prefix}_eyebrow`];
  const title = values[`${prefix}_title`] ?? defaults[`${prefix}_title`];
  const x = numberValue(values[`${prefix}_text_x`], Number(defaults[`${prefix}_text_x`]));
  const y = numberValue(values[`${prefix}_text_y`], Number(defaults[`${prefix}_text_y`]));

  function updatePoint(event) {
    const bounds = previewRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const nextX = Math.min(95, Math.max(5, ((event.clientX - bounds.left) / bounds.width) * 100));
    const nextY = Math.min(92, Math.max(8, ((event.clientY - bounds.top) / bounds.height) * 100));
    onChange({
      [`${prefix}_text_x`]: nextX.toFixed(1),
      [`${prefix}_text_y`]: nextY.toFixed(1),
    });
  }

  function resetPosition() {
    onChange({
      [`${prefix}_text_x`]: defaults[`${prefix}_text_x`],
      [`${prefix}_text_y`]: defaults[`${prefix}_text_y`],
    });
  }

  return (
    <section className="border border-neutral-200 bg-white p-4 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#075f8f]">Scroll Story</p>
          <h3 className="mt-1 text-2xl font-light" style={{ fontFamily: 'var(--font-cormorant)' }}>
            Hero Stage Text
          </h3>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-neutral-500">
            Edit each caption, then drag it over the hero image or video to choose its position.
          </p>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="self-start bg-neutral-900 px-6 py-3 text-[10px] uppercase tracking-[0.17em] text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
        >
          {saving ? 'Saving Text & Positions…' : 'Save Text & Positions'}
        </button>
      </div>

      <div className="mt-7 flex flex-wrap gap-2 rounded-full bg-[#eaf6fa] p-1 sm:w-fit">
        {STAGES.map(item => (
          <button
            key={item.number}
            type="button"
            onClick={() => setStage(item.number)}
            className={`flex-1 rounded-full px-4 py-2 text-[10px] uppercase tracking-[0.16em] transition-colors sm:flex-none ${
              stage === item.number ? 'bg-[#075f8f] text-white shadow-sm' : 'text-[#075f8f]'
            }`}
          >
            Stage {item.number}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(220px,.55fr)]">
        <div
          ref={previewRef}
          className="relative aspect-video touch-none select-none overflow-hidden bg-[#063a5b] shadow-inner"
          onPointerDown={event => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
            updatePoint(event);
          }}
          onPointerMove={event => {
            if (dragging) updatePoint(event);
          }}
          onPointerUp={event => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            setDragging(false);
          }}
          onPointerCancel={() => setDragging(false)}
          role="application"
          aria-label={`Choose the text position for hero animation stage ${stage}`}
        >
          {image ? (
            <HeroMedia src={image} alt="Hero text position preview" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-xs uppercase tracking-[.18em] text-white/50">Upload hero media first</div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-[#022d47]/30" />
          <div
            className="pointer-events-none absolute w-[min(82%,520px)] -translate-x-1/2 -translate-y-1/2 text-center text-white drop-shadow-lg"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <p className="mb-2 text-[9px] uppercase tracking-[.28em] text-[#ffd1da]">{eyebrow}</p>
            <p className="font-serif text-[clamp(1.4rem,4vw,3rem)] leading-[.92]">{title}</p>
          </div>
          <div
            className="pointer-events-none absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80"
            style={{ left: `${x}%`, top: `${y}%` }}
          />
          <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-[#022d47]/75 px-3 py-1.5 text-[9px] uppercase tracking-[.16em] text-white">
            Drag to position Stage {stage} text
          </span>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 text-[10px] uppercase tracking-[.12em] text-neutral-500">
            <div className="border border-neutral-200 px-3 py-3">Horizontal <strong className="float-right text-neutral-800">{x.toFixed(1)}%</strong></div>
            <div className="border border-neutral-200 px-3 py-3">Vertical <strong className="float-right text-neutral-800">{y.toFixed(1)}%</strong></div>
          </div>
          <p className="text-[11px] leading-relaxed text-neutral-400">
            This anchor controls where both the small line and main line land during Stage {stage}.
          </p>
          <button
            type="button"
            onClick={resetPosition}
            className="self-start border-b border-neutral-400 pb-0.5 text-[10px] uppercase tracking-[.14em] text-neutral-500"
          >
            Reset Stage {stage} position
          </button>
        </div>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-2">
        {STAGES.map(({ number, note }) => {
          const eyebrowKey = `hero_stage_${number}_eyebrow`;
          const titleKey = `hero_stage_${number}_title`;
          return (
            <div key={number} className="border border-neutral-200 bg-[#fffdfa] p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h4 className="font-medium text-neutral-800">Stage {number}</h4>
                <span className="text-[9px] uppercase tracking-[0.12em] text-neutral-400">{note}</span>
              </div>
              <label className="flex flex-col gap-2">
                <span className="text-[9px] uppercase tracking-[0.16em] text-neutral-500">Small line</span>
                <input
                  type="text"
                  value={values[eyebrowKey] ?? defaults[eyebrowKey]}
                  onChange={event => onChange({ [eyebrowKey]: event.target.value })}
                  className="border border-neutral-300 bg-white px-3 py-2.5 text-sm focus:border-[#075f8f] focus:outline-none"
                />
              </label>
              <label className="mt-4 flex flex-col gap-2">
                <span className="text-[9px] uppercase tracking-[0.16em] text-neutral-500">Main line</span>
                <textarea
                  rows={2}
                  value={values[titleKey] ?? defaults[titleKey]}
                  onChange={event => onChange({ [titleKey]: event.target.value })}
                  className="resize-y border border-neutral-300 bg-white px-3 py-2.5 text-sm leading-relaxed focus:border-[#075f8f] focus:outline-none"
                />
              </label>
            </div>
          );
        })}
      </div>

      {message && (
        <p className={`mt-5 text-xs ${message.startsWith('✓') ? 'text-green-600' : 'text-neutral-500'}`}>
          {message}
        </p>
      )}
    </section>
  );
}
