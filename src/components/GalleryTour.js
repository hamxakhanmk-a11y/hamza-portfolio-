'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// Scroll-driven walk through a filmed gallery. The film has its own paintings removed; each wall
// position ("slot") is tracked frame by frame. The film and the artist's paintings are drawn together
// in one WebGL canvas from the same video frame, so a painting can never slip off its wall.
const TOUR_BASE = '/gallery-tour';
const SVH_PER_SECOND = 9; // scroll length: svh of scrolling per second of film
const CAPTION_WIDTH = 1.3; // caption box width, in canvas widths
const CAPTION_TEXTURE = [1024, 256];
const SHADOW_PAD = 0.18; // blur room around the painting in the shadow texture, per side
const HAZE_COLOR = [0.95, 0.95, 0.95];

function optimizedImage(url) {
  return `/_next/image?url=${encodeURIComponent(url)}&w=1080&q=75`;
}

// Homography mapping the unit square (0,0)(1,0)(1,1)(0,1) onto a quad.
function squareToQuad([x0, y0, x1, y1, x2, y2, x3, y3]) {
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

function project(h, u, v) {
  return [h[0] * u + h[1] * v + h[2], h[3] * u + h[4] * v + h[5], h[6] * u + h[7] * v + h[8]];
}

function unproject(h, x, y) {
  // inverse of the homography applied to a screen point
  const [a, b, c, d, e, f, g, k, i] = h;
  const inv = [e * i - f * k, c * k - b * i, b * f - c * e, f * g - d * i, a * i - c * g, c * d - a * f, d * k - e * g, b * g - a * k, a * e - b * d];
  const w = inv[6] * x + inv[7] * y + inv[8];
  return [(inv[0] * x + inv[1] * y + inv[2]) / w, (inv[3] * x + inv[4] * y + inv[5]) / w];
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

function cssFont(variable, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `${value}, ${fallback}` : fallback;
}

// Power-of-two canvases so every texture can be mipmapped: distant paintings stay smooth instead of shimmering.
function potCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function artCanvas(image) {
  const canvas = potCanvas(1024, 1024);
  canvas.getContext('2d').drawImage(image, 0, 0, 1024, 1024);
  return canvas;
}

// Soft shadow shaped like the painting (round and cut-out works cast round and cut-out shadows).
function shadowCanvas(image) {
  const size = 512;
  const canvas = potCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const inner = size / (1 + 2 * SHADOW_PAD);
  const pad = (size - inner) / 2;
  ctx.shadowColor = 'rgba(0,0,0,1)';
  ctx.shadowBlur = inner * 0.06;
  ctx.shadowOffsetX = size * 4; // draw the painting off-canvas so only its shadow lands
  ctx.drawImage(image, pad - size * 4, pad, inner, inner);
  return canvas;
}

function captionCanvas(artwork, fontFamily) {
  const canvas = potCanvas(...CAPTION_TEXTURE);
  const ctx = canvas.getContext('2d');
  const scale = CAPTION_TEXTURE[0] / (CAPTION_WIDTH * 1000); // caption layout is in 1000ths of the canvas width
  ctx.scale(scale, scale);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const centre = (CAPTION_WIDTH * 1000) / 2;
  ctx.fillStyle = '#2f2b26';
  ctx.font = `500 62px ${fontFamily}`;
  let title = artwork.title || '';
  while (title.length > 4 && ctx.measureText(title).width > CAPTION_WIDTH * 1000 - 40) title = `${title.slice(0, -2)}…`;
  ctx.fillText(title, centre, 6);
  const meta = [artwork.size, artwork.medium].filter(Boolean).join(' · ').toUpperCase();
  if (meta) {
    ctx.fillStyle = 'rgba(47,43,38,0.62)';
    ctx.font = `500 26px ${fontFamily}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
    ctx.fillText(meta, centre, 90);
  }
  return canvas;
}

const VERTEX_SHADER = `
attribute vec3 aPos;
attribute vec2 aUv;
varying vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = vec4(aPos.xy, 0.0, aPos.z);
}`;

const FRAGMENT_SHADER = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uLight;
uniform float uHaze;
uniform float uAlpha;
uniform vec3 uHazeColor;
uniform float uShadow;
void main() {
  vec4 c = texture2D(uTex, vUv);
  if (uShadow > 0.5) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, c.a * uAlpha);
    gl_FragColor.rgb *= gl_FragColor.a;
    return;
  }
  vec3 rgb = c.a > 0.0 ? c.rgb / c.a : c.rgb;
  rgb = mix(rgb * uLight, uHazeColor, uHaze);
  float a = c.a * uAlpha;
  gl_FragColor = vec4(rgb * a, a);
}`;

function createRenderer(canvas) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: false });
  if (!gl) return null;
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const loc = {
    pos: gl.getAttribLocation(program, 'aPos'),
    uv: gl.getAttribLocation(program, 'aUv'),
    tex: gl.getUniformLocation(program, 'uTex'),
    light: gl.getUniformLocation(program, 'uLight'),
    haze: gl.getUniformLocation(program, 'uHaze'),
    alpha: gl.getUniformLocation(program, 'uAlpha'),
    hazeColor: gl.getUniformLocation(program, 'uHazeColor'),
    shadow: gl.getUniformLocation(program, 'uShadow'),
  };
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(loc.pos);
  gl.enableVertexAttribArray(loc.uv);
  gl.vertexAttribPointer(loc.pos, 3, gl.FLOAT, false, 20, 0);
  gl.vertexAttribPointer(loc.uv, 2, gl.FLOAT, false, 20, 12);
  gl.uniform1i(loc.tex, 0);
  gl.uniform3fv(loc.hazeColor, HAZE_COLOR);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const anisotropy = gl.getExtension('EXT_texture_filter_anisotropic');
  const maxAnisotropy = anisotropy ? Math.min(8, gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)) : 0;

  const makeTexture = (source, mipmap) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmap ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    if (source) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      if (mipmap) {
        gl.generateMipmap(gl.TEXTURE_2D);
        if (maxAnisotropy) gl.texParameterf(gl.TEXTURE_2D, anisotropy.TEXTURE_MAX_ANISOTROPY_EXT, maxAnisotropy);
      }
    }
    return texture;
  };
  const videoTexture = makeTexture(null, false);
  const data = new Float32Array(30);

  // Draw a rectangle of plane coordinates [u0,u1]x[v0,v1] through screen homography h (pixels).
  const drawQuad = (h, [u0, v0, u1, v1], texture, uniforms) => {
    const corners = [[u0, v0, 0, 0], [u1, v0, 1, 0], [u1, v1, 1, 1], [u0, v0, 0, 0], [u1, v1, 1, 1], [u0, v1, 0, 1]];
    const width = canvas.width, height = canvas.height;
    for (let k = 0; k < 6; k++) {
      const [u, v, s, t] = corners[k];
      const [x, y, w] = project(h, u, v);
      data[k * 5] = (x / width) * 2 - w;
      data[k * 5 + 1] = w - (y / height) * 2;
      data[k * 5 + 2] = w;
      data[k * 5 + 3] = s;
      data[k * 5 + 4] = t;
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1f(loc.light, uniforms.light ?? 1);
    gl.uniform1f(loc.haze, uniforms.haze ?? 0);
    gl.uniform1f(loc.alpha, uniforms.alpha ?? 1);
    gl.uniform1f(loc.shadow, uniforms.shadow ? 1 : 0);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  return {
    gl,
    makeTexture,
    drawQuad,
    uploadVideo(video) {
      gl.bindTexture(gl.TEXTURE_2D, videoTexture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    },
    videoTexture,
    dispose() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

export default function GalleryTour({ slots }) {
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const router = useRouter();
  const [tour, setTour] = useState(null);
  const [loaded, setLoaded] = useState(0); // download progress 0..1
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [featured, setFeatured] = useState(null); // slot id of the most prominent painting
  const [hovering, setHovering] = useState(false);
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

  // Download the whole film first so playing and rewinding never wait on the network.
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
    const canvas = canvasRef.current;
    let renderer;
    try {
      renderer = createRenderer(canvas);
    } catch {
      renderer = null;
    }
    if (!renderer) {
      setFailed(true);
      return undefined;
    }
    const { gl } = renderer;
    const frames = indexTour(tour);
    const fps = tour.fps;
    const lastFrame = tour.frames - 1;
    const art = new Map(); // slot -> { texture, shadow, caption, aspect }
    let disposed = false;
    let view = { scale: 1, x: 0, y: 0, dpr: 1, portrait: false };
    let shownFrame = 0;
    let haveVideoFrame = false;
    let drawn = []; // painting hit areas of the last drawn frame
    let featuredSlot = null;
    let target = 0;
    let lastProgress = -1;
    let rafId = 0;
    let videoCallback = 0;
    let visible = true;

    // ── textures for each painting ──
    const fontFamily = cssFont('--font-cormorant', 'Georgia, serif');
    (document.fonts?.ready || Promise.resolve()).then(() => {
      for (const { slot, artwork } of filled) {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => {
          if (disposed || !image.naturalWidth) return;
          art.set(slot, {
            aspect: image.naturalWidth / image.naturalHeight,
            texture: renderer.makeTexture(artCanvas(image), true),
            shadow: renderer.makeTexture(shadowCanvas(image), true),
            caption: renderer.makeTexture(captionCanvas(artwork, fontFamily), true),
          });
          draw();
        };
        image.src = optimizedImage(artwork.image_url);
      }
    });

    function draw() {
      const frame = shownFrame;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.SCISSOR_TEST);
      gl.clearColor(0.937, 0.929, 0.918, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (!haveVideoFrame) return;
      const s = view.scale * view.dpr, ox = view.x * view.dpr, oy = view.y * view.dpr;
      // the film
      const film = [s * tour.width, 0, ox, 0, s * tour.height, oy, 0, 0, 1];
      renderer.drawQuad(film, [0, 0, 1, 1], renderer.videoTexture, {});
      // corridor openings hide the paintings beyond them
      const clip = tour.clip && tour.clip.x[frame - tour.clip.start];
      if (clip) {
        gl.enable(gl.SCISSOR_TEST);
        const left = Math.max(0, Math.floor(ox + clip[0] * s));
        gl.scissor(left, 0, Math.max(0, Math.ceil(ox + clip[1] * s) - left), canvas.height);
      }
      const hits = [];
      let best = null;
      let bestArea = 0;
      for (const entry of frames[frame] || []) {
        const painting = art.get(entry.slot);
        if (!painting) continue;
        const q = entry.quad.map((value, k) => value * s + (k % 2 ? oy : ox));
        const h = squareToQuad(q);
        // skip if the label box would reach behind the camera
        if ([[-0.3, -0.2], [1.3, -0.2], [-0.3, 1.6], [1.3, 1.6]].some(([u, v]) => project(h, u, v)[2] <= 0.05)) continue;
        // fit the painting inside the canvas the film hung there, keeping its proportions
        const fitWide = painting.aspect > entry.aspect;
        const fw = fitWide ? 1 : painting.aspect / entry.aspect;
        const fh = fitWide ? entry.aspect / painting.aspect : 1;
        const u0 = (1 - fw) / 2, v0 = (1 - fh) / 2;
        const light = entry.light ? Math.min(1.04, Math.max(0.72, entry.light / 226)) : 1;
        const uniforms = { light, haze: entry.haze };
        const padU = fw * SHADOW_PAD, padV = fh * SHADOW_PAD;
        const drop = 0.035;
        renderer.drawQuad(h, [u0 - padU + 0.01, v0 - padV + drop, u0 + fw + padU + 0.01, v0 + fh + padV + drop], painting.shadow, { shadow: true, alpha: 0.42 * (1 - entry.haze) });
        renderer.drawQuad(h, [u0, v0, u0 + fw, v0 + fh], painting.texture, uniforms);
        const captionTop = v0 + fh + 0.06;
        // the caption texture keeps its own proportions on the wall: plane v units are canvas heights
        const captionHeight = CAPTION_WIDTH * (CAPTION_TEXTURE[1] / CAPTION_TEXTURE[0]) * entry.aspect;
        const cu0 = 0.5 - CAPTION_WIDTH / 2;
        renderer.drawQuad(h, [cu0, captionTop, cu0 + CAPTION_WIDTH, captionTop + captionHeight], painting.caption, uniforms);
        hits.push({ slot: entry.slot, h, rect: [u0, v0, u0 + fw, v0 + fh] });
        const area = quadArea(entry.quad) / (tour.width * tour.height);
        if (area > bestArea) { bestArea = area; best = entry.slot; }
      }
      drawn = hits;
      const next = bestArea > 0.035 ? best : null;
      if (next !== featuredSlot) { featuredSlot = next; setFeatured(next); }
    }

    function presentFrame(frame) {
      shownFrame = Math.max(0, Math.min(lastFrame, frame));
      renderer.uploadVideo(video);
      haveVideoFrame = true;
      draw();
    }

    // The frame callback hands over each frame as it is shown, so the paintings use exactly that frame.
    const onVideoFrame = (_, metadata) => {
      if (disposed) return;
      presentFrame(Math.round(metadata.mediaTime * fps));
      videoCallback = video.requestVideoFrameCallback(onVideoFrame);
    };
    const hasFrameCallback = 'requestVideoFrameCallback' in video;
    if (hasFrameCallback) videoCallback = video.requestVideoFrameCallback(onVideoFrame);

    const resize = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      const portrait = width / height < 1.2;
      // landscape screens: fill the screen; phones: a wide band so both walls stay in view
      const scale = portrait ? Math.min((width * 1.8) / tour.width, height / tour.height) : Math.max(width / tour.width, height / tour.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      view = { scale, dpr, portrait, x: (width - tour.width * scale) / 2, y: (height - tour.height * scale) / 2 };
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      // on phones the film is a band across the middle; soft fades blend its edges into the page
      stage.style.setProperty('--band-top', portrait ? `${view.y}px` : '-50%');
      stage.style.setProperty('--band-bottom', portrait ? `${view.y + tour.height * scale}px` : '150%');
      draw();
    };

    const readScroll = () => {
      const rect = rootRef.current.getBoundingClientRect();
      const travel = rootRef.current.offsetHeight - window.innerHeight;
      const p = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
      target = p * lastFrame;
      if (Math.abs(p - lastProgress) > 0.002) { lastProgress = p; setProgress(p); }
    };

    // Forward: play the film, faster the further behind the scroll it is. Backward: ease back with short seeks.
    const tick = () => {
      rafId = requestAnimationFrame(tick);
      if (!visible || video.readyState < 2) return;
      const current = video.currentTime * fps;
      const behind = target - current;
      if (behind > 1.5) {
        if (behind > fps * 6 && !video.seeking) {
          video.currentTime = (target - fps * 1.5) / fps; // far jump: skip most of the way
          return;
        }
        const rate = Math.min(3, Math.max(0.75, behind / fps / 0.5));
        const stepped = Math.round(rate * 4) / 4;
        if (Math.abs(video.playbackRate - stepped) > 0.01) video.playbackRate = stepped;
        if (video.paused) video.play().catch(() => {});
      } else {
        if (!video.paused) video.pause();
        if (behind < -1.5 && !video.seeking) {
          const step = Math.max(1, Math.min(-behind * 0.3, fps * 0.5));
          video.currentTime = Math.max(target, current - step) / fps;
        }
      }
      if (!hasFrameCallback) {
        const frame = Math.floor(video.currentTime * fps + 0.01);
        if (frame !== shownFrame || !haveVideoFrame) presentFrame(frame);
      }
    };

    const onSeeked = () => { if (!hasFrameCallback || video.paused) presentFrame(Math.floor(video.currentTime * fps + 0.01)); };
    video.addEventListener('seeked', onSeeked);

    const onReady = () => {
      readScroll();
      video.currentTime = (Math.round(target) + 0.5) / fps;
      setReady(true);
    };
    video.addEventListener('loadeddata', onReady, { once: true });

    // clicking a painting opens it
    const pick = event => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * view.dpr, y = (event.clientY - rect.top) * view.dpr;
      for (let k = drawn.length - 1; k >= 0; k--) {
        const [u, v] = unproject(drawn[k].h, x, y);
        const [u0, v0, u1, v1] = drawn[k].rect;
        if (u >= u0 && u <= u1 && v >= v0 && v <= v1) return drawn[k].slot;
      }
      return null;
    };
    const onMove = event => setHovering(Boolean(pick(event)));
    const onClick = event => {
      const slot = pick(event);
      const artwork = slot && bySlot.get(slot);
      if (artwork) router.push(`/portfolio/${artwork.id}`);
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('click', onClick);

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible && !video.paused) video.pause();
    });
    observer.observe(rootRef.current);
    window.addEventListener('scroll', readScroll, { passive: true });
    window.addEventListener('resize', resize);
    resize();
    readScroll();
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('scroll', readScroll);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('click', onClick);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('loadeddata', onReady);
      if (videoCallback && 'cancelVideoFrameCallback' in video) video.cancelVideoFrameCallback(videoCallback);
      video.pause();
      renderer.dispose();
    };
    // Slots come from the server render and don't change while mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour]);

  if (failed || filled.length === 0) return null;

  const seconds = tour ? tour.frames / tour.fps : 150;
  const featuredArtwork = featured ? bySlot.get(featured) : null;
  const atEnd = progress > 0.985;

  function skipToCollection() {
    document.getElementById('portfolio-collection')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <section
      ref={rootRef}
      className="relative bg-[#efedea]"
      style={{ height: `${Math.round(seconds * SVH_PER_SECOND)}svh` }}
      aria-label="Walk-through gallery of portfolio paintings"
    >
      <div ref={stageRef} className="sticky top-0 h-[100svh] overflow-hidden bg-[#efedea]">
        {/* The film plays here underneath; the canvas on top draws each of its frames with the paintings. */}
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline preload="auto" aria-hidden="true" />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          style={{ cursor: hovering ? 'pointer' : 'default' }}
        />
        <div className="gallery-tour-fade gallery-tour-fade--top pointer-events-none absolute inset-x-0" aria-hidden="true" />
        <div className="gallery-tour-fade gallery-tour-fade--bottom pointer-events-none absolute inset-x-0" aria-hidden="true" />

        {/* Loading veil */}
        <div className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#efedea] transition-opacity duration-700 ${ready ? 'opacity-0' : 'opacity-100'}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${TOUR_BASE}/poster.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40 blur-sm" />
          <p className="relative text-[10px] uppercase tracking-[0.35em] text-[#075f8f]/70">Opening the gallery</p>
          <span className="relative block h-px w-40 overflow-hidden bg-[#075f8f]/15">
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

        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4 sm:bottom-10">
          {ready && progress < 0.01 && (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#075f8f]/70">Scroll to walk through the gallery</p>
              <span className="block h-9 w-5 rounded-full border border-[#075f8f]/40 p-1">
                <span className="mx-auto block h-2 w-1 animate-bounce rounded-full bg-[#075f8f]/60" />
              </span>
            </div>
          )}

          {featuredArtwork && progress >= 0.01 && !atEnd && (
            <div key={featured} className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-4 rounded-2xl border border-white/60 bg-white/75 px-5 py-4 shadow-[0_12px_40px_rgba(6,58,91,.12)] backdrop-blur-md">
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
              className="pointer-events-auto rounded-full bg-[#075f8f] px-6 py-3 text-[10px] uppercase tracking-[0.22em] text-white shadow-lg transition hover:bg-[#ed7189]"
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
