'use client';

import { useRef, useState } from 'react';
import HeroMedia from '@/components/HeroMedia';

// titleVw / boxVw mirror the live hero CSS on a 1440px-wide desktop
// (font-size and text-box width as a share of screen width) so the preview matches the page.
const STAGES = {
  1: { label: 'Opening view', note: 'Full painting with your title', titleVw: 8, boxVw: 70, minZoom: 1 },
  2: { label: 'First detail', note: 'First push-in toward a detail', titleVw: 5, boxVw: 30, minZoom: 1.05 },
  3: { label: 'Second detail', note: 'Second detail with a statement', titleVw: 5, boxVw: 70, minZoom: 1.05 },
  4: { label: 'Final view', note: 'Invitation into the collection', titleVw: 9, boxVw: 70, minZoom: 1 },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function numberValue(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number(fallback);
}

export default function HeroStageEditor({ image, values, defaults, onChange, onSave, saving, message }) {
  const [stage, setStage] = useState(1);
  const [mode, setMode] = useState('text');
  const [dragging, setDragging] = useState(false);
  const previewRef = useRef(null);
  const dragRef = useRef({ mode: 'text', offsetX: 0, offsetY: 0 });

  const config = STAGES[stage];
  const prefix = `hero_stage_${stage}`;
  const read = key => values[`${prefix}_${key}`] ?? defaults[`${prefix}_${key}`];

  const eyebrow = read('eyebrow') ?? '';
  const title = read('title') ?? '';
  const textX = numberValue(read('text_x'), 50);
  const textY = numberValue(read('text_y'), 50);
  const textSize = numberValue(read('text_size'), 1);
  const focusX = numberValue(read('x'), 50);
  const focusY = numberValue(read('y'), 50);
  const zoom = numberValue(read('zoom'), 1);

  const cameraX = (focusX - 50) * (1 - zoom);
  const cameraY = (focusY - 50) * (1 - zoom);

  function pointerPercent(event) {
    const bounds = previewRef.current.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    };
  }

  function applyDrag(event) {
    const point = pointerPercent(event);
    const { mode: dragMode, offsetX, offsetY } = dragRef.current;
    if (dragMode === 'text') {
      onChange({
        [`${prefix}_text_x`]: clamp(point.x - offsetX, 5, 95).toFixed(1),
        [`${prefix}_text_y`]: clamp(point.y - offsetY, 8, 92).toFixed(1),
      });
    } else {
      onChange({
        [`${prefix}_x`]: clamp(point.x, 0, 100).toFixed(1),
        [`${prefix}_y`]: clamp(point.y, 0, 100).toFixed(1),
      });
    }
  }

  function handlePointerDown(event) {
    if (!previewRef.current) return;
    const grabbed = event.target.closest('[data-drag]')?.dataset.drag;
    const dragMode = grabbed || mode;
    const point = pointerPercent(event);
    // Grabbing the text itself keeps it under the finger instead of jumping to its centre.
    dragRef.current = grabbed === 'text'
      ? { mode: 'text', offsetX: point.x - textX, offsetY: point.y - textY }
      : { mode: dragMode, offsetX: 0, offsetY: 0 };
    setMode(dragMode);
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    applyDrag(event);
  }

  function endDrag(event) {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  }

  function resetText() {
    onChange({
      [`${prefix}_text_x`]: defaults[`${prefix}_text_x`],
      [`${prefix}_text_y`]: defaults[`${prefix}_text_y`],
      [`${prefix}_text_size`]: defaults[`${prefix}_text_size`],
    });
  }

  function resetCamera() {
    onChange({
      [`${prefix}_x`]: defaults[`${prefix}_x`],
      [`${prefix}_y`]: defaults[`${prefix}_y`],
      [`${prefix}_zoom`]: defaults[`${prefix}_zoom`],
    });
  }

  const tabClass = active => `rounded-full px-4 py-2 text-[10px] uppercase tracking-[0.16em] transition-colors ${
    active ? 'bg-[#075f8f] text-white shadow-sm' : 'text-[#075f8f]'
  }`;

  return (
    <section className="border border-neutral-200 bg-white p-4 sm:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#075f8f]">Scroll Story</p>
          <h3 className="mt-1 text-2xl font-light" style={{ fontFamily: 'var(--font-cormorant)' }}>
            Hero Stages
          </h3>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-neutral-500">
            Each stage shows exactly what visitors see: the camera zoom and focus, with your text on top.
            Drag the text to move it, or drag the round marker to change where the camera looks.
          </p>
        </div>
        <div className="flex flex-wrap rounded-full bg-[#eaf6fa] p-1">
          {[1, 2, 3, 4].map(item => (
            <button key={item} type="button" onClick={() => setStage(item)} className={tabClass(stage === item)}>
              Stage {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1.6fr)_minmax(270px,.75fr)]">
        {/* ── Live preview ── */}
        <div>
          <div
            ref={previewRef}
            className="relative aspect-video touch-none select-none overflow-hidden bg-[#063a5b] shadow-inner"
            style={{ containerType: 'inline-size', cursor: mode === 'text' ? 'move' : 'crosshair' }}
            onPointerDown={handlePointerDown}
            onPointerMove={event => {
              if (!dragging) return;
              // A mouse with no button held means the release was missed — stop dragging.
              if (event.pointerType === 'mouse' && event.buttons === 0) { setDragging(false); return; }
              applyDrag(event);
            }}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={() => setDragging(false)}
            role="application"
            aria-label={`Hero stage ${stage} preview. Drag to position the ${mode === 'text' ? 'text' : 'camera focus'}.`}
          >
            {image ? (
              <HeroMedia
                src={image}
                alt="Hero stage preview"
                className="pointer-events-none h-full w-full object-cover"
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
            <div className="intro-media-shade pointer-events-none" />

            {/* Text exactly as it lands on the page */}
            <div
              data-drag="text"
              className={`absolute -translate-x-1/2 -translate-y-1/2 text-center text-white ${
                mode === 'text' ? 'outline outline-1 outline-dashed outline-white/60 outline-offset-4' : ''
              }`}
              style={{ left: `${textX}%`, top: `${textY}%`, width: `${config.boxVw}cqw`, textShadow: '0 3px 25px rgba(0,0,0,.42)' }}
            >
              <p
                className="uppercase text-[#ffd1da]"
                style={{ fontSize: `calc(max(.42rem, .85cqw) * ${textSize})`, letterSpacing: '.38em', marginBottom: '1.2cqw' }}
              >
                {eyebrow}
              </p>
              <p
                className="whitespace-pre-line [overflow-wrap:anywhere] [text-wrap:balance]"
                style={{ fontFamily: 'var(--font-cormorant)', fontSize: `calc(${config.titleVw}cqw * ${textSize})`, lineHeight: .95 }}
              >
                {title}
              </p>
            </div>

            {/* Camera focus marker */}
            {image && (
              <div
                data-drag="camera"
                className={`absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white transition-shadow ${
                  mode === 'camera'
                    ? 'bg-[#27a8c7]/55 shadow-[0_0_0_6px_rgba(39,168,199,.35),0_4px_18px_rgba(0,0,0,.35)]'
                    : 'bg-white/15 opacity-70 shadow-[0_4px_18px_rgba(0,0,0,.3)]'
                }`}
                style={{ left: `${focusX}%`, top: `${focusY}%`, cursor: 'crosshair' }}
              >
                <span className="absolute left-1/2 top-1/2 h-px w-5 -translate-x-1/2 bg-white" />
                <span className="absolute left-1/2 top-1/2 h-5 w-px -translate-y-1/2 bg-white" />
              </div>
            )}

            <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-[#022d47]/75 px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-white backdrop-blur-sm">
              Stage {stage} · Dragging moves the {mode === 'text' ? 'text' : 'camera focus'}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-neutral-500">
            <span>Drag moves:</span>
            <div className="flex rounded-full bg-[#eaf6fa] p-1">
              <button type="button" onClick={() => setMode('text')} className={tabClass(mode === 'text')}>Text</button>
              <button type="button" onClick={() => setMode('camera')} className={tabClass(mode === 'camera')}>Camera focus</button>
            </div>
          </div>
        </div>

        {/* ── Controls for this stage ── */}
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs font-medium text-neutral-700">Stage {stage} · {config.label}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">{config.note}</p>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-[9px] uppercase tracking-[0.16em] text-neutral-500">Small line</span>
            <input
              type="text"
              value={eyebrow}
              onChange={event => onChange({ [`${prefix}_eyebrow`]: event.target.value })}
              className="border border-neutral-300 bg-white px-3 py-2.5 text-sm focus:border-[#075f8f] focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[9px] uppercase tracking-[0.16em] text-neutral-500">Main line</span>
            <textarea
              rows={2}
              value={title}
              onChange={event => onChange({ [`${prefix}_title`]: event.target.value })}
              className="resize-y border border-neutral-300 bg-white px-3 py-2.5 text-sm leading-relaxed focus:border-[#075f8f] focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-neutral-500">
              Text size
              <strong className="text-[#075f8f]">{Math.round(textSize * 100)}%</strong>
            </span>
            <input
              type="range"
              min="0.6"
              max="1.6"
              step="0.05"
              value={textSize}
              onChange={event => onChange({ [`${prefix}_text_size`]: event.target.value })}
              className="w-full accent-[#075f8f]"
            />
            <span className="flex justify-between text-[9px] uppercase tracking-wider text-neutral-300">
              <span>Smaller</span><span>Larger</span>
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <span className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-neutral-500">
              Magnification
              <strong className="text-[#075f8f]">{zoom.toFixed(2)}×</strong>
            </span>
            <input
              type="range"
              min={config.minZoom}
              max="1.8"
              step="0.01"
              value={zoom}
              onChange={event => onChange({ [`${prefix}_zoom`]: event.target.value })}
              className="w-full accent-[#075f8f]"
            />
            <span className="flex justify-between text-[9px] uppercase tracking-wider text-neutral-300">
              <span>Full view</span><span>Close detail</span>
            </span>
          </label>

          <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.1em] text-neutral-500">
            <div className="border border-neutral-200 px-3 py-2.5">Text ↔ <strong className="float-right text-neutral-800">{textX.toFixed(1)}%</strong></div>
            <div className="border border-neutral-200 px-3 py-2.5">Text ↕ <strong className="float-right text-neutral-800">{textY.toFixed(1)}%</strong></div>
            <div className="border border-neutral-200 px-3 py-2.5">Focus ↔ <strong className="float-right text-neutral-800">{focusX.toFixed(1)}%</strong></div>
            <div className="border border-neutral-200 px-3 py-2.5">Focus ↕ <strong className="float-right text-neutral-800">{focusY.toFixed(1)}%</strong></div>
          </div>

          <div className="flex flex-wrap gap-5">
            <button type="button" onClick={resetText} className="border-b border-neutral-400 pb-0.5 text-[10px] uppercase tracking-[0.14em] text-neutral-500">
              Reset text
            </button>
            <button type="button" onClick={resetCamera} className="border-b border-neutral-400 pb-0.5 text-[10px] uppercase tracking-[0.14em] text-neutral-500">
              Reset camera
            </button>
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-4 border-t border-neutral-200 pt-6">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="bg-neutral-900 px-7 py-3 text-xs uppercase tracking-[0.17em] text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
        >
          {saving ? 'Saving Hero…' : 'Save All 4 Stages'}
        </button>
        <p className={`text-xs ${message?.startsWith('✓') ? 'text-green-600' : 'text-neutral-500'}`}>
          {message || 'Text, size, camera focus and zoom for every stage are saved together.'}
        </p>
      </div>
    </section>
  );
}
