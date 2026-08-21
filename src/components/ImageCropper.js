'use client';

import { useEffect, useRef, useState } from 'react';

const VIEW_SIZE = 460;

function removeEdgeWhiteBackground(ctx, width, height) {
  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const isBackground = index => {
    const i = index * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    return data[i + 3] < 10 || (r > 232 && g > 232 && b > 232 && Math.max(r, g, b) - Math.min(r, g, b) < 22);
  };

  const add = index => {
    if (!visited[index] && isBackground(index)) {
      visited[index] = 1;
      queue[tail++] = index;
    }
  };

  for (let x = 0; x < width; x += 1) {
    add(x);
    add((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    add(y * width);
    add(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) add(index - 1);
    if (x + 1 < width) add(index + 1);
    if (y > 0) add(index - width);
    if (y + 1 < height) add(index + width);
  }

  for (let index = 0; index < visited.length; index += 1) {
    if (visited[index]) data[index * 4 + 3] = 0;
  }
  ctx.putImageData(image, 0, 0);
}

function trimTransparentCanvas(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 6) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }

  if (right < left || bottom < top || (left === 0 && top === 0 && right === width - 1 && bottom === height - 1)) {
    return canvas;
  }

  const trimmed = document.createElement('canvas');
  trimmed.width = right - left + 1;
  trimmed.height = bottom - top + 1;
  trimmed.getContext('2d').drawImage(canvas, left, top, trimmed.width, trimmed.height, 0, 0, trimmed.width, trimmed.height);
  return trimmed;
}

export default function ImageCropper({ file, aspect = 1, allowAspect = false, removeWhite = false, onCancel, onApply }) {
  const imageRef = useRef(null);
  const dragRef = useRef(null);
  const [source] = useState(() => URL.createObjectURL(file));
  const [natural, setNatural] = useState({ width: 1, height: 1 });
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [mode, setMode] = useState('fit');
  const [removeBackground, setRemoveBackground] = useState(removeWhite);
  const [cropAspect, setCropAspect] = useState(aspect);
  const [aspectChoice, setAspectChoice] = useState(allowAspect ? 'original' : 'fixed');
  const [working, setWorking] = useState(false);
  const usesOriginalSize = allowAspect && aspectChoice === 'original';

  const viewWidth = cropAspect >= 1 ? VIEW_SIZE : VIEW_SIZE * cropAspect;
  const viewHeight = cropAspect >= 1 ? VIEW_SIZE / cropAspect : VIEW_SIZE;
  const quarterTurn = Math.abs(rotation % 180) === 90;
  const frameWidth = quarterTurn ? natural.height : natural.width;
  const frameHeight = quarterTurn ? natural.width : natural.height;
  const baseScale = mode === 'fit'
    ? Math.min(viewWidth / frameWidth, viewHeight / frameHeight)
    : Math.max(viewWidth / frameWidth, viewHeight / frameHeight);
  const renderedWidth = natural.width * baseScale * zoom;
  const renderedHeight = natural.height * baseScale * zoom;

  useEffect(() => () => URL.revokeObjectURL(source), [source]);

  useEffect(() => {
    const closeOnEscape = event => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onCancel]);

  function clampPosition(next, currentZoom = zoom) {
    const scale = baseScale * currentZoom;
    const width = frameWidth * scale;
    const height = frameHeight * scale;
    // Always leave some positioning freedom. In "fit" mode this intentionally
    // allows a little empty space so the complete artwork can be composed
    // left/right/up/down without forcing a crop.
    const maxX = Math.max(viewWidth * 0.28, Math.abs(width - viewWidth) / 2);
    const maxY = Math.max(viewHeight * 0.28, Math.abs(height - viewHeight) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    };
  }

  function pointerDown(event) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, start: position };
  }

  function pointerMove(event) {
    if (!dragRef.current) return;
    setPosition(clampPosition({
      x: dragRef.current.start.x + event.clientX - dragRef.current.x,
      y: dragRef.current.start.y + event.clientY - dragRef.current.y,
    }));
  }

  function changeZoom(event) {
    const nextZoom = Number(event.target.value);
    setZoom(nextZoom);
    setPosition(current => clampPosition(current, nextZoom));
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }

  function rotate(direction) {
    setRotation(current => (current + direction + 360) % 360);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }

  function chooseAspect(choice, nextAspect) {
    setAspectChoice(choice);
    setCropAspect(nextAspect);
    setMode('fit');
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }

  function nudge(x, y) {
    setPosition(current => clampPosition({ x: current.x + x, y: current.y + y }));
  }

  async function applyCrop() {
    setWorking(true);
    const originalScale = Math.min(1800 / natural.width, 1800 / natural.height, 1);
    const outputWidth = usesOriginalSize
      ? Math.round(natural.width * originalScale)
      : cropAspect >= 1 ? 1400 : Math.round(1400 * cropAspect);
    const outputHeight = usesOriginalSize
      ? Math.round(natural.height * originalScale)
      : cropAspect >= 1 ? Math.round(1400 / cropAspect) : 1400;
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: removeBackground });
    if (usesOriginalSize) {
      ctx.drawImage(imageRef.current, 0, 0, outputWidth, outputHeight);
      if (removeBackground) removeEdgeWhiteBackground(ctx, outputWidth, outputHeight);
      const finalCanvas = trimTransparentCanvas(canvas);
      const blob = await new Promise(resolve => finalCanvas.toBlob(resolve, 'image/png'));
      onApply(new File([blob], `original-${Date.now()}.png`, { type: 'image/png' }));
      setWorking(false);
      return;
    }

    const outputScale = outputWidth / viewWidth;
    ctx.clearRect(0, 0, outputWidth, outputHeight);
    ctx.translate(outputWidth / 2 + position.x * outputScale, outputHeight / 2 + position.y * outputScale);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.scale(flipX ? -1 : 1, 1);
    ctx.drawImage(imageRef.current, -renderedWidth * outputScale / 2, -renderedHeight * outputScale / 2, renderedWidth * outputScale, renderedHeight * outputScale);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (removeBackground) removeEdgeWhiteBackground(ctx, outputWidth, outputHeight);
    const finalCanvas = trimTransparentCanvas(canvas);
    const blob = await new Promise(resolve => finalCanvas.toBlob(resolve, 'image/png'));
    onApply(new File([blob], `edited-${Date.now()}.png`, { type: 'image/png' }));
    setWorking(false);
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/75 overflow-y-auto overscroll-contain p-3 sm:p-6"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="bg-white w-full max-w-2xl mx-auto min-h-min shadow-2xl">
        <div className="sticky top-0 z-20 bg-white border-b border-neutral-100 px-5 sm:px-8 py-4 flex items-center justify-between">
          <button type="button" onClick={onCancel} className="text-xs uppercase tracking-[0.18em] text-neutral-600 hover:text-black flex items-center gap-2">
            <span aria-hidden="true">←</span> Back
          </button>
          <button type="button" onClick={onCancel} aria-label="Close editor" className="text-neutral-400 hover:text-black text-2xl leading-none">×</button>
        </div>

        <div className="px-5 sm:px-8 pt-5">
          <div className="mb-5">
          <div>
            <h2 className="text-2xl font-light" style={{ fontFamily: 'var(--font-cormorant)' }}>Adjust Photo</h2>
            <p className="text-xs text-neutral-500 mt-1">Keep the full painting visible, then drag it into position. Cropping is optional.</p>
          </div>
          </div>
        </div>

        <div className="mx-5 sm:mx-8 overflow-auto bg-neutral-100 p-3">
          <div
            className="relative overflow-hidden mx-auto bg-[linear-gradient(45deg,#eee_25%,transparent_25%),linear-gradient(-45deg,#eee_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#eee_75%),linear-gradient(-45deg,transparent_75%,#eee_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px] cursor-grab active:cursor-grabbing touch-none"
            style={{ width: viewWidth, height: viewHeight, maxWidth: '100%' }}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={() => { dragRef.current = null; }}
            onPointerCancel={() => { dragRef.current = null; }}
          >
            {source && (
              <img
                ref={imageRef}
                src={source}
                alt="Crop preview"
                draggable="false"
                onLoad={event => {
                  const dimensions = { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight };
                  setNatural(dimensions);
                  if (allowAspect && aspectChoice === 'original') {
                    setCropAspect(dimensions.width / dimensions.height);
                  }
                }}
                className="absolute max-w-none select-none pointer-events-none"
                style={{
                  width: renderedWidth,
                  height: renderedHeight,
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scaleX(${flipX ? -1 : 1})`,
                }}
              />
            )}
            <div className="absolute inset-0 border-2 border-white/90 pointer-events-none shadow-[inset_0_0_0_1px_rgba(0,0,0,.25)]" />
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
              {Array.from({ length: 9 }).map((_, index) => <div key={index} className="border border-white/50" />)}
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-8 mt-5 space-y-4">
          {allowAspect && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-neutral-500 mb-2">Frame shape</div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => chooseAspect('original', natural.width / natural.height)} className={`px-4 py-2 text-[10px] uppercase tracking-widest border ${aspectChoice === 'original' ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-300'}`}>Original</button>
                <button type="button" onClick={() => chooseAspect('square', 1)} className={`px-4 py-2 text-[10px] uppercase tracking-widest border ${aspectChoice === 'square' ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-300'}`}>Square</button>
                <button type="button" onClick={() => chooseAspect('portrait', 4 / 5)} className={`px-4 py-2 text-[10px] uppercase tracking-widest border ${aspectChoice === 'portrait' ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-300'}`}>Portrait</button>
                <button type="button" onClick={() => chooseAspect('landscape', 4 / 3)} className={`px-4 py-2 text-[10px] uppercase tracking-widest border ${aspectChoice === 'landscape' ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-300'}`}>Landscape</button>
              </div>
              {usesOriginalSize && (
                <p className="text-xs text-neutral-500 mt-3 border-l-2 border-neutral-300 pl-3">
                  Original uploads the complete photo at its own proportions. No crop frame or transparent padding is added.
                </p>
              )}
            </div>
          )}

          {!usesOriginalSize && <div className="flex flex-wrap items-center justify-center gap-2">
            <button type="button" onClick={() => changeMode('fit')} className={`px-4 py-2 text-[10px] uppercase tracking-widest border ${mode === 'fit' ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-300'}`}>Full Painting</button>
            <button type="button" onClick={() => changeMode('fill')} className={`px-4 py-2 text-[10px] uppercase tracking-widest border ${mode === 'fill' ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-300'}`}>Crop to Frame</button>
            <button type="button" onClick={() => rotate(-90)} className="px-4 py-2 text-[10px] uppercase tracking-widest border border-neutral-300">↶ Rotate</button>
            <button type="button" onClick={() => rotate(90)} className="px-4 py-2 text-[10px] uppercase tracking-widest border border-neutral-300">Rotate ↷</button>
            <button type="button" onClick={() => setFlipX(value => !value)} className={`px-4 py-2 text-[10px] uppercase tracking-widest border ${flipX ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-300'}`}>Flip</button>
          </div>}

          {!usesOriginalSize && <>
            <div className="flex justify-between text-[11px] uppercase tracking-wider text-neutral-500 mb-2"><span>Zoom</span><span>{zoom.toFixed(1)}×</span></div>
            <input type="range" min="0.7" max="4" step="0.02" value={zoom} onChange={changeZoom} className="w-full accent-neutral-900" />

            <p className="text-[11px] text-center text-neutral-400">
              Full Painting keeps every edge visible. Crop to Frame is only for photos you intentionally want to trim.
            </p>

            <div className="flex items-center justify-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 mr-2">Fine position</span>
              <button type="button" onClick={() => nudge(-10, 0)} className="w-9 h-9 border border-neutral-300">←</button>
              <button type="button" onClick={() => nudge(0, -10)} className="w-9 h-9 border border-neutral-300">↑</button>
              <button type="button" onClick={() => nudge(0, 10)} className="w-9 h-9 border border-neutral-300">↓</button>
              <button type="button" onClick={() => nudge(10, 0)} className="w-9 h-9 border border-neutral-300">→</button>
            </div>
          </>}

          {removeWhite && (
            <label className="flex items-start gap-3 border border-neutral-200 p-3 cursor-pointer">
              <input type="checkbox" checked={removeBackground} onChange={event => setRemoveBackground(event.target.checked)} className="mt-0.5 accent-neutral-900" />
              <span className="text-xs text-neutral-500">Remove white background connected to the photo edges. White details inside the painting stay visible.</span>
            </label>
          )}
        </div>

        <div className="sticky bottom-0 z-20 bg-white border-t border-neutral-100 px-5 sm:px-8 py-4 flex gap-3 mt-6 shadow-[0_-8px_22px_rgba(0,0,0,.06)]">
          <button type="button" onClick={onCancel} className="flex-1 border border-neutral-300 py-3 text-xs uppercase tracking-widest">Cancel</button>
          <button type="button" onClick={applyCrop} disabled={working} className="flex-1 bg-neutral-900 text-white py-3 text-xs uppercase tracking-widest disabled:opacity-40">{working ? 'Preparing…' : 'Use Photo'}</button>
        </div>
      </div>
    </div>
  );
}
