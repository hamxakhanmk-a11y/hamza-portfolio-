'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// Scroll-scrubbed walk through a filmed gallery. The film has its own paintings removed; each wall
// position ("slot") is tracked frame by frame, and the artist's paintings are drawn onto those walls.
const TOUR_BASE = '/gallery-tour';
const SVH_PER_SECOND = 9; // scroll length: svh of scrolling per second of film
const LAYOUT_WIDTH = 1000; // px width of a slot's layout box before it is projected onto the wall
const CAPTION_SPACE = 1.5; // layout box height, in canvas heights, so the caption fits below the canvas

function optimizedImage(url) {
  return `/_next/image?url=${encodeURIComponent(url)}&w=1080&q=75`;
}

// Homography mapping the unit square (0,0)(1,0)(1,1)(0,1) onto a quad.
function squareToQuad(x0, y0, x1, y1, x2, y2, x3, y3) {
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  let g = 0, h = 0;
  if (Math.abs(sx) > 1e-9 || Math.abs(sy) > 1e-9) {
    const den = dx1 * dy2 - dx2 * dy1;
    g = (sx * dy2 - dx2 * sy) / den;
    h = (dx1 * sy - sx * dy1) / den;
  }
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
}

function quadArea(q) {
  let sum = 0;
  for (let k = 0; k < 4; k++) {
    const j = (k + 1) % 4;
    sum += q[2 * k] * q[2 * j + 1] - q[2 * j] * q[2 * k + 1];
  }
  return Math.abs(sum) / 2;
}

// Per frame: which slots are on screen, with their canvas corners and lighting.
function indexTour(tour) {
  const frames = Array.from({ length: tour.frames }, () => []);
  for (const run of tour.runs) {
    run.q.forEach((quad, k) => {
      frames[run.start + k]?.push({ slot: run.slot, quad, aspect: run.aspect, light: run.l[k], haze: run.h?.[k] || 0 });
    });
  }
  return frames;
}

export default function GalleryTour({ slots }) {
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const boxRef = useRef(null);
  const videoRef = useRef(null);
  const layerRef = useRef(null);
  const slotRefs = useRef(new Map());
  const artAspects = useRef(new Map());
  const router = useRouter();
  const [tour, setTour] = useState(null);
  const [loaded, setLoaded] = useState(0); // download progress 0..1
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [featured, setFeatured] = useState(null); // slot id of the most prominent painting
  const [progress, setProgress] = useState(0);
  const filled = slots.filter(entry => entry.artwork);
  const bySlot = new Map(filled.map(entry => [entry.slot, entry.artwork]));

  useEffect(() => {
    let cancelled = false;
    fetch(`${TOUR_BASE}/tour.json`)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('tour data missing'))))
      .then(data => { if (!cancelled) setTour(data); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  // Download the whole film first: scrubbing a fully buffered file is smooth, streaming it is not.
  useEffect(() => {
    if (!tour) return undefined;
    const video = videoRef.current;
    const controller = new AbortController();
    let objectUrl = null;
    const src = `${TOUR_BASE}/${window.innerWidth < 768 ? 'tour-480.mp4' : 'tour-720.mp4'}`;
    (async () => {
      try {
        const res = await fetch(src, { signal: controller.signal });
        if (!res.ok || !res.body) throw new Error('video unavailable');
        const total = Number(res.headers.get('content-length')) || 0;
        const reader = res.body.getReader();
        const chunks = [];
        let received = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          if (total) setLoaded(received / total);
        }
        objectUrl = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
        video.src = objectUrl;
      } catch (error) {
        if (error.name === 'AbortError') return;
        video.src = src; // fall back to streaming
      }
    })();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [tour]);

  useEffect(() => {
    if (!tour) return undefined;
    const video = videoRef.current;
    const stage = stageRef.current;
    const box = boxRef.current;
    const layer = layerRef.current;
    const frames = indexTour(tour);
    const fps = tour.fps;
    const lastFrame = tour.frames - 1;
    let scale = 1;
    let target = 0;
    let current = 0;
    let shownFrame = -1;
    let featuredSlot = null;
    let lastProgress = -1;
    let rafId = 0;
    let lastTime = performance.now();
    let visible = true;
    let videoCallback = 0;

    const layoutSlot = (element, aspect) => {
      const artAspect = artAspects.current.get(Number(element.dataset.slot));
      const key = `${aspect}|${artAspect}`;
      if (element.dataset.layout === key) return;
      element.dataset.layout = key;
      const canvasHeight = LAYOUT_WIDTH / aspect;
      element.style.width = `${LAYOUT_WIDTH}px`;
      element.style.height = `${canvasHeight * CAPTION_SPACE}px`;
      const art = element.querySelector('[data-art]');
      const caption = element.querySelector('[data-caption]');
      if (!artAspect) { art.style.visibility = 'hidden'; return; }
      // contain the painting in the canvas the film had hung there
      const width = artAspect > aspect ? LAYOUT_WIDTH : canvasHeight * artAspect;
      const height = artAspect > aspect ? LAYOUT_WIDTH / artAspect : canvasHeight;
      Object.assign(art.style, {
        visibility: 'visible',
        left: `${(LAYOUT_WIDTH - width) / 2}px`,
        top: `${(canvasHeight - height) / 2}px`,
        width: `${width}px`,
        height: `${height}px`,
      });
      caption.style.top = `${(canvasHeight + height) / 2 + LAYOUT_WIDTH * 0.045}px`;
    };

    const showFrame = frame => {
      frame = Math.max(0, Math.min(lastFrame, frame));
      if (frame === shownFrame) return;
      shownFrame = frame;
      // where the camera looks out of a corridor, paintings beyond its opening are hidden by its walls
      const clip = tour.clip && tour.clip.x[frame - tour.clip.start];
      layer.style.clipPath = clip ? `inset(0 ${(tour.width - clip[1]) * scale}px 0 ${clip[0] * scale}px)` : 'none';
      const onScreen = new Set();
      let best = null;
      let bestArea = 0;
      for (const entry of frames[frame]) {
        const element = slotRefs.current.get(entry.slot);
        if (!element) continue;
        const q = entry.quad.map(v => v * scale);
        const h = squareToQuad(...q);
        const canvasHeight = LAYOUT_WIDTH / entry.aspect;
        // skip when part of the caption box would project from behind the camera
        const behind = [[-0.3, 0], [1.3, 0], [-0.3, CAPTION_SPACE], [1.3, CAPTION_SPACE]].some(([u, v]) => h[6] * u + h[7] * v + h[8] <= 0.02);
        if (behind) continue;
        layoutSlot(element, entry.aspect);
        const a = h[0] / LAYOUT_WIDTH, b = h[3] / LAYOUT_WIDTH, c = h[6] / LAYOUT_WIDTH;
        const d = h[1] / canvasHeight, e = h[4] / canvasHeight, f = h[7] / canvasHeight;
        element.style.transform = `matrix3d(${a},${b},0,${c},${d},${e},0,${f},0,0,1,0,${h[2]},${h[5]},0,${h[8]})`;
        element.style.visibility = 'visible';
        const brightness = entry.light ? Math.min(1.04, Math.max(0.7, entry.light / 226)) : 1;
        element.style.setProperty('--light', brightness.toFixed(3));
        element.style.setProperty('--haze', entry.haze.toFixed(2));
        onScreen.add(entry.slot);
        const area = quadArea(entry.quad) / (tour.width * tour.height);
        if (area > bestArea) { bestArea = area; best = entry.slot; }
      }
      slotRefs.current.forEach((element, slot) => { if (!onScreen.has(slot)) element.style.visibility = 'hidden'; });
      const next = bestArea > 0.035 ? best : null;
      if (next !== featuredSlot) { featuredSlot = next; setFeatured(next); }
    };

    const onVideoFrame = (_, metadata) => {
      showFrame(Math.round(metadata.mediaTime * fps));
      videoCallback = video.requestVideoFrameCallback(onVideoFrame);
    };
    const onSeeked = () => showFrame(Math.floor(video.currentTime * fps + 0.01));
    // the frame callback is exact when supported; 'seeked' covers browsers (and hidden tabs) without it
    if ('requestVideoFrameCallback' in video) videoCallback = video.requestVideoFrameCallback(onVideoFrame);
    video.addEventListener('seeked', onSeeked);

    const resize = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      const portrait = width / height < 1.2;
      // landscape screens: fill the screen; phones: a wide band so both walls stay in view
      scale = portrait ? Math.min((width * 1.5) / tour.width, height / tour.height) : Math.max(width / tour.width, height / tour.height);
      const boxWidth = tour.width * scale;
      const boxHeight = tour.height * scale;
      Object.assign(box.style, {
        width: `${boxWidth}px`,
        height: `${boxHeight}px`,
        left: `${(width - boxWidth) / 2}px`,
        top: `${(height - boxHeight) / 2}px`,
      });
      box.dataset.portrait = portrait ? 'true' : 'false';
      shownFrame = -1;
      showFrame(Math.round(current));
    };

    const readScroll = () => {
      const rect = rootRef.current.getBoundingClientRect();
      const travel = rootRef.current.offsetHeight - window.innerHeight;
      const p = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
      target = p * lastFrame;
      if (Math.abs(p - lastProgress) > 0.002) { lastProgress = p; setProgress(p); }
    };

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      if (!visible || video.readyState < 1) return;
      current += (target - current) * Math.min(1, delta * 7);
      if (Math.abs(target - current) < 0.05) current = target;
      const wanted = (Math.round(current) + 0.5) / fps;
      if (!video.seeking && Math.abs(video.currentTime - wanted) > 0.5 / fps) video.currentTime = wanted;
    };

    const onReady = () => {
      setReady(true);
      readScroll();
      current = target;
      video.currentTime = (Math.round(current) + 0.5) / fps;
    };
    video.addEventListener('loadeddata', onReady, { once: true });

    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    observer.observe(rootRef.current);
    window.addEventListener('scroll', readScroll, { passive: true });
    window.addEventListener('resize', resize);
    resize();
    readScroll();
    tick();

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('scroll', readScroll);
      window.removeEventListener('resize', resize);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('loadeddata', onReady);
      if (videoCallback && 'cancelVideoFrameCallback' in video) video.cancelVideoFrameCallback(videoCallback);
    };
  }, [tour]);

  if (failed || filled.length === 0) return null;

  const seconds = tour ? tour.frames / tour.fps : 150;
  const featuredArtwork = featured ? bySlot.get(featured) : null;
  const atEnd = progress > 0.985;

  function skipToCollection() {
    document.getElementById('portfolio-collection')?.scrollIntoView({ behavior: 'smooth' });
  }

  function rememberAspect(slot, image) {
    if (!image.naturalWidth) return;
    artAspects.current.set(slot, image.naturalWidth / image.naturalHeight);
    const element = slotRefs.current.get(slot);
    if (element) delete element.dataset.layout;
  }

  return (
    <section
      ref={rootRef}
      className="relative bg-[#efedea]"
      style={{ height: `${Math.round(seconds * SVH_PER_SECOND)}svh` }}
      aria-label="Walk-through gallery of portfolio paintings"
    >
      <div ref={stageRef} className="sticky top-0 h-[100svh] overflow-hidden bg-[#efedea]">
        <div ref={boxRef} className="gallery-tour-box absolute">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full"
            poster={`${TOUR_BASE}/poster.jpg`}
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
          />
          <div ref={layerRef} className={`absolute inset-0 transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}>
            {filled.map(({ slot, artwork }) => (
              <div
                key={slot}
                ref={element => {
                  if (element) slotRefs.current.set(slot, element);
                  else slotRefs.current.delete(slot);
                }}
                data-slot={slot}
                className="gallery-tour-slot pointer-events-none absolute left-0 top-0"
                style={{ visibility: 'hidden', transformOrigin: '0 0' }}
              >
                <button
                  type="button"
                  data-art
                  onClick={() => router.push(`/portfolio/${artwork.id}`)}
                  className="pointer-events-auto absolute cursor-pointer"
                  style={{ visibility: 'hidden' }}
                  aria-label={`Open ${artwork.title}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={optimizedImage(artwork.image_url)}
                    alt=""
                    draggable={false}
                    onLoad={event => rememberAspect(slot, event.currentTarget)}
                    ref={image => { if (image?.complete) rememberAspect(slot, image); }}
                    className="gallery-tour-art h-full w-full"
                  />
                </button>
                <div data-caption className="gallery-tour-caption absolute left-[-15%] w-[130%] text-center">
                  <p className="gallery-tour-title">{artwork.title}</p>
                  {(artwork.size || artwork.medium) && (
                    <p className="gallery-tour-meta">{[artwork.size, artwork.medium].filter(Boolean).join(' · ')}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Loading veil */}
        <div className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#efedea]/80 backdrop-blur-sm transition-opacity duration-700 ${ready ? 'opacity-0' : 'opacity-100'}`}>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#075f8f]/70">Opening the gallery</p>
          <span className="block h-px w-40 overflow-hidden bg-[#075f8f]/15">
            <span className="block h-full bg-[#075f8f]/60 transition-[width] duration-300" style={{ width: `${Math.round(loaded * 100)}%` }} />
          </span>
        </div>

        <button
          type="button"
          onClick={skipToCollection}
          className="absolute right-4 top-24 rounded-full bg-white/70 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#075f8f] backdrop-blur transition hover:bg-white sm:right-8 sm:top-32"
        >
          Skip to collection ↓
        </button>

        <div className="absolute inset-x-0 bottom-6 flex justify-center px-4 sm:bottom-10">
          {ready && progress < 0.01 && (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#075f8f]/70">Scroll to walk through the gallery</p>
              <span className="block h-9 w-5 rounded-full border border-[#075f8f]/40 p-1">
                <span className="mx-auto block h-2 w-1 animate-bounce rounded-full bg-[#075f8f]/60" />
              </span>
            </div>
          )}

          {featuredArtwork && progress >= 0.01 && !atEnd && (
            <div key={featured} className="flex w-full max-w-md items-center justify-between gap-4 rounded-2xl border border-white/60 bg-white/75 px-5 py-4 shadow-[0_12px_40px_rgba(6,58,91,.12)] backdrop-blur-md">
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-[0.28em] text-[#ed7189]">Now viewing</p>
                <p className="truncate text-xl text-[#063a5b]" style={{ fontFamily: 'var(--font-cormorant)' }}>{featuredArtwork.title}</p>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/portfolio/${featuredArtwork.id}`)}
                className="shrink-0 rounded-full bg-[#075f8f] px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] text-white transition hover:bg-[#ed7189]"
              >
                View →
              </button>
            </div>
          )}

          {atEnd && (
            <button
              type="button"
              onClick={skipToCollection}
              className="rounded-full bg-[#075f8f] px-6 py-3 text-[10px] uppercase tracking-[0.22em] text-white shadow-lg transition hover:bg-[#ed7189]"
            >
              Explore the full collection ↓
            </button>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[#075f8f]/10" aria-hidden="true">
          <div className="h-full bg-[#075f8f]/50" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </section>
  );
}
