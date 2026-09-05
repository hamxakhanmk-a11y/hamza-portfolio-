'use client';

import { useRef, useState } from 'react';
import HeroMedia from '@/components/HeroMedia';

const STAGES = {
  1: {
    label: 'Stage 1 · Opening view',
    description: 'Choose where the opening camera starts before the story begins to flow.',
    defaults: { x: 50, y: 50, zoom: 1 },
  },
  2: {
    label: 'Stage 2 · First detail',
    description: 'The first push-in after the opening view.',
    defaults: { x: 72, y: 35, zoom: 1.32 },
  },
  3: {
    label: 'Stage 3 · Second detail',
    description: 'The second focal area before the final view.',
    defaults: { x: 28, y: 48, zoom: 1.48 },
  },
  4: {
    label: 'Stage 4 · Final view',
    description: 'Keep the full painting or turn the ending into another detail shot.',
    defaults: { x: 50, y: 50, zoom: 1 },
  },
};

function numberValue(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function HeroCameraEditor({ image, values, onChange, onSave, saving, message }) {
  const [stage, setStage] = useState(1);
  const [dragging, setDragging] = useState(false);
  const previewRef = useRef(null);
  const config = STAGES[stage];
  const prefix = `hero_stage_${stage}`;
  const x = numberValue(values[`${prefix}_x`], config.defaults.x);
  const y = numberValue(values[`${prefix}_y`], config.defaults.y);
  const zoom = numberValue(values[`${prefix}_zoom`], config.defaults.zoom);
  const cameraX = (x - 50) * (1 - zoom);
  const cameraY = (y - 50) * (1 - zoom);

  function updatePoint(event) {
    const bounds = previewRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const nextX = Math.min(100, Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100));
    const nextY = Math.min(100, Math.max(0, ((event.clientY - bounds.top) / bounds.height) * 100));
    onChange({
      [`${prefix}_x`]: nextX.toFixed(1),
      [`${prefix}_y`]: nextY.toFixed(1),
    });
  }

  function resetStage() {
    onChange({
      [`${prefix}_x`]: String(config.defaults.x),
      [`${prefix}_y`]: String(config.defaults.y),
      [`${prefix}_zoom`]: String(config.defaults.zoom),
    });
  }

  return (
    <section className="border border-neutral-200 bg-white p-4 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#075f8f]">Scroll Animation</p>
          <h3 className="mt-1 text-2xl font-light" style={{ fontFamily: 'var(--font-cormorant)' }}>
            Hero Camera Path
          </h3>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-neutral-500">
            Set an independent focal point and zoom for every stage. The same camera path works with a painting or a looping hero video.
          </p>
        </div>
        <div className="flex rounded-full bg-[#eaf6fa] p-1">
          {[1, 2, 3, 4].map(item => (
            <button
              key={item}
              type="button"
              onClick={() => setStage(item)}
              className={`rounded-full px-4 py-2 text-[10px] uppercase tracking-[0.16em] transition-colors ${
                stage === item ? 'bg-[#075f8f] text-white shadow-sm' : 'text-[#075f8f]'
              }`}
            >
              Stage {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,.7fr)]">
        <div>
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
            aria-label={`Choose the focal point for hero animation stage ${stage}`}
          >
            {image ? (
              <HeroMedia
                src={image}
                alt="Hero camera preview"
                className="h-full w-full object-cover"
                style={{
                  transform: `translate(${cameraX}%, ${cameraY}%) scale(${zoom})`,
                  transformOrigin: '50% 50%',
                  transition: dragging ? 'none' : 'transform 420ms cubic-bezier(.16, 1, .3, 1)',
                }}
              />
            ) : (
              <div className="grid h-full place-items-center px-6 text-center text-xs uppercase tracking-[0.18em] text-white/55">
                Upload hero media first
              </div>
            )}
            {image && (
              <>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#022d47]/25 via-transparent to-[#022d47]/20" />
                <div
                  className="pointer-events-none absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#27a8c7]/45 shadow-[0_0_0_6px_rgba(7,95,143,.24),0_4px_18px_rgba(0,0,0,.35)]"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <span className="absolute left-1/2 top-1/2 h-px w-5 -translate-x-1/2 bg-white" />
                  <span className="absolute left-1/2 top-1/2 h-5 w-px -translate-y-1/2 bg-white" />
                </div>
                <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-[#022d47]/75 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                  Drag to choose the focal point
                </span>
              </>
            )}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-neutral-400">
            The marker is the visual anchor—the camera pushes toward this part of the hero media.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <p className="text-xs font-medium text-neutral-700">{config.label}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">{config.description}</p>
          </div>

          <label className="flex flex-col gap-3">
            <span className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-neutral-500">
              Magnification
              <strong className="text-[#075f8f]">{zoom.toFixed(2)}×</strong>
            </span>
            <input
              type="range"
              min={stage === 1 || stage === 4 ? '1' : '1.05'}
              max="1.8"
              step="0.01"
              value={zoom}
              onChange={event => onChange({ [`${prefix}_zoom`]: event.target.value })}
              className="w-full accent-[#075f8f]"
            />
            <span className="flex justify-between text-[9px] uppercase tracking-wider text-neutral-300">
              <span>Subtle</span><span>Close detail</span>
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3 text-[10px] uppercase tracking-[0.12em] text-neutral-500">
            <div className="border border-neutral-200 px-3 py-3">Horizontal <strong className="float-right text-neutral-800">{x.toFixed(1)}%</strong></div>
            <div className="border border-neutral-200 px-3 py-3">Vertical <strong className="float-right text-neutral-800">{y.toFixed(1)}%</strong></div>
          </div>

          <button
            type="button"
            onClick={resetStage}
            className="self-start border-b border-neutral-400 pb-0.5 text-[10px] uppercase tracking-[0.14em] text-neutral-500"
          >
            Reset Stage {stage}
          </button>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-4 border-t border-neutral-200 pt-6">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !image}
          className="bg-neutral-900 px-7 py-3 text-xs uppercase tracking-[0.17em] text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
        >
          {saving ? 'Saving Camera Path…' : 'Save Camera Path'}
        </button>
        {message && (
          <p className={`text-xs ${message.startsWith('✓') ? 'text-green-600' : 'text-neutral-500'}`}>
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
