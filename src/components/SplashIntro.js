'use client';

import { useEffect, useRef } from 'react';

// The home page's opening on a fresh visit (first arrival or refresh): glossy blue liquid splashes in the
// middle of a navy screen, swirls into a ball, then bursts into six streams that fly up and become the
// page tabs. The navy then opens up to reveal the hero, and the hero's title writes itself in.
//
// The layout's head script marks <html data-splash="pending"> before the first paint on a full load of
// "/", so client-side visits to Home never replay it. The stages are driven through that attribute
// (pending → liquid → reveal → text → removed) and styled in globals.css.
//
// Liquid: every droplet is splatted as a soft blob into a small "field" canvas; a WebGL pass thresholds
// the field (so nearby blobs merge like liquid) and shades it with a glossy highlight.

const FIELD_SCALE = 0.35;
const T = { arcStart: 0.15, arcEnd: 0.95, swirlEnd: 1.45, burst: 1.5, stagger: 0.06, flight: 0.46, grow: 0.22, fade: 0.35, reveal: 0.95 };
const STREAM = 16; // droplets per tab stream

const clamp01 = x => Math.max(0, Math.min(1, x));
const easeInOut = x => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const easeIn = x => x * x * x;
const easeOut = x => 1 - (1 - x) ** 3;
const easeOutBack = x => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2;
const rand = (a, b) => a + Math.random() * (b - a);

const VERTEX = `attribute vec2 p; varying vec2 uv; void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAGMENT = `precision mediump float;
uniform sampler2D field; uniform vec2 texel; varying vec2 uv;
float f(vec2 o) { return texture2D(field, uv + o).r; }
void main() {
  float v = f(vec2(0.0));
  float a = smoothstep(0.42, 0.54, v);
  if (a <= 0.0) { gl_FragColor = vec4(0.0); return; }
  float gx = f(vec2(texel.x, 0.0)) - f(vec2(-texel.x, 0.0));
  float gy = f(vec2(0.0, texel.y)) - f(vec2(0.0, -texel.y));
  vec3 n = normalize(vec3(-gx * 2.6, -gy * 2.6, 1.0));
  float h = smoothstep(0.45, 1.0, v);
  vec3 light = normalize(vec3(-0.45, 0.6, 0.75));
  float diffuse = max(dot(n, light), 0.0);
  float spec = pow(max(dot(reflect(-light, n), vec3(0.0, 0.0, 1.0)), 0.0), 22.0);
  vec3 deep = vec3(0.02, 0.27, 0.58), bright = vec3(0.12, 0.62, 0.95);
  vec3 col = mix(deep, bright, clamp(h * 0.55 + diffuse * 0.5, 0.0, 1.0));
  col = mix(col, deep * 0.75, (1.0 - h) * 0.35) + spec * 0.85;
  gl_FragColor = vec4(col * a, a);
}`;

function createRenderer(canvas, field) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false });
  if (!gl) return null;
  const shader = (type, source) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = shader(gl.VERTEX_SHADER, VERTEX), fs = shader(gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const p = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(p);
  gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const texel = gl.getUniformLocation(program, 'texel');
  return () => {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(texel, 1 / field.width, 1 / field.height);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, field);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
}

// A soft round blob: 1 at the centre, 0.5 at radius r (the visible edge), 0 at 2r.
function createSprite() {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  const ctx = sprite.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  [[0, 1], [0.3, 0.84], [0.5, 0.5], [0.75, 0.14], [1, 0]].forEach(([at, a]) => g.addColorStop(at, `rgba(255,255,255,${a})`));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return sprite;
}

// Where each tab sits on screen. Offsets, not getBoundingClientRect: the tabs are scaled down while hidden.
function measureTabs() {
  const nav = document.querySelector('.navbar-shell .nav-flow-tabs');
  if (!nav) return [];
  const box = nav.getBoundingClientRect();
  return [...nav.querySelectorAll('.nav-flow-link')].map(link => ({
    link,
    x: box.left + link.offsetLeft - nav.scrollLeft + link.offsetWidth / 2,
    y: box.top + link.offsetTop + link.offsetHeight / 2,
    w: link.offsetWidth,
    h: link.offsetHeight,
  }));
}

function heroReady() {
  const media = document.querySelector('.intro-media img, .intro-media video');
  if (!media) return true;
  return media.tagName === 'VIDEO' ? media.readyState >= 2 : media.complete && media.naturalWidth > 0;
}

export default function SplashIntro() {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.splash !== 'pending') return;
    root.dataset.splash = 'liquid';
    const overlay = rootRef.current, canvas = canvasRef.current;
    const field = document.createElement('canvas');
    const fctx = field.getContext('2d');
    const sprite = createSprite();
    const render = createRenderer(canvas, field);
    const flat = render ? null : canvas.getContext('2d');

    let w = 0, h = 0, C = { x: 0, y: 0 }, R = 0, tabs = [], frame = 0, t = 0, last = 0, revealAt = 0, stage = 'liquid';
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      field.width = Math.ceil(w * FIELD_SCALE); field.height = Math.ceil(h * FIELD_SCALE);
      C = { x: w / 2, y: h * 0.52 };
      R = Math.min(w, h) * 0.17;
      tabs = measureTabs();
      tabs.forEach((tab, i) => {
        // each stream curves out to the side, then up into its tab
        const s = tab.x - C.x;
        tab.control = { x: tab.x + s * 0.35, y: C.y + (tab.y - C.y) * 0.35 };
        tab.landsAt = T.burst + i * T.stagger + T.flight;
      });
    };
    resize();

    const drops = []; // free droplets: arc, swirl and splash-back
    const head = { x: 0, y: 0, r: 0 };
    let emitted = 0, swirlStarted = false;
    const streamJitter = Array.from({ length: tabs.length * STREAM }, () => [rand(-1, 1), rand(-1, 1)]);
    const splashed = new Set();

    const blob = (x, y, r, strength = 1) => {
      if (r <= 0.3) return;
      fctx.globalAlpha = strength;
      const s = r * 2 * FIELD_SCALE;
      fctx.drawImage(sprite, x * FIELD_SCALE - s, y * FIELD_SCALE - s, s * 2, s * 2);
    };
    const pill = (cx, cy, pw, ph, strength) => {
      // a capsule drawn as a row of overlapping blobs
      const r = ph / 2, from = cx - pw / 2 + r, to = cx + pw / 2 - r;
      for (let x = from; x <= to + 0.1; x += Math.max(1, r * 0.5)) blob(x, cy, r * 0.82, strength * 0.62);
    };

    const step = now => {
      // The clock only moves with frames that were actually drawn: if the page is busy loading and a frame
      // comes late, the animation pauses for that moment instead of jumping ahead and skipping part of it.
      const dt = last ? Math.min(1 / 30, (now - last) / 1000) : 0;
      last = now;
      t += dt;
      fctx.globalCompositeOperation = 'source-over';
      fctx.globalAlpha = 1;
      fctx.fillStyle = '#000';
      fctx.fillRect(0, 0, field.width, field.height);
      fctx.globalCompositeOperation = 'lighter';

      // 1. An arc of droplets sweeps round the centre behind a heavier head.
      if (t >= T.arcStart && t < T.arcEnd) {
        const k = easeInOut((t - T.arcStart) / (T.arcEnd - T.arcStart));
        const angle = -2.6 + 3.6 * k, radius = R * (1.05 - 0.25 * k);
        const tx = -Math.sin(angle), ty = Math.cos(angle);
        head.x = C.x + Math.cos(angle) * radius; head.y = C.y + Math.sin(angle) * radius;
        head.r = R * 0.16 * Math.min(1, (t - T.arcStart) / 0.12);
        const due = Math.floor((t - T.arcStart) * 95);
        for (; emitted < due; emitted++) {
          const out = rand(20, 120), side = rand(-40, 40);
          drops.push({ x: head.x + rand(-4, 4), y: head.y + rand(-4, 4), vx: Math.cos(angle) * out + tx * side, vy: Math.sin(angle) * out + ty * side, r: R * rand(0.035, 0.09) });
        }
      }
      // 2. Everything swirls inwards and gathers into one ball.
      if (t >= T.arcEnd && !swirlStarted) {
        swirlStarted = true;
        drops.push({ x: head.x, y: head.y, r: head.r, vx: 0, vy: 0 });
        head.r = 0;
        drops.forEach(d => { d.angle = Math.atan2(d.y - C.y, d.x - C.x); d.radius = Math.hypot(d.x - C.x, d.y - C.y); d.r0 = d.r; });
      }
      if (swirlStarted && t < T.swirlEnd) {
        const k = easeIn(clamp01((t - T.arcEnd) / (T.swirlEnd - T.arcEnd)));
        drops.forEach(d => {
          d.angle += dt * 6.5;
          const radius = d.radius * (1 - k);
          d.x = C.x + Math.cos(d.angle) * radius; d.y = C.y + Math.sin(d.angle) * radius;
          d.r = d.r0 * (1 - k * 0.4);
        });
      } else if (!swirlStarted) {
        drops.forEach(d => { const drag = Math.exp(-3 * dt); d.vx *= drag; d.vy *= drag; d.x += d.vx * dt; d.y += d.vy * dt; });
      }
      if (swirlStarted && t >= T.swirlEnd) {
        for (let i = drops.length - 1; i >= 0; i--) if (!drops[i].life) drops.splice(i, 1);
      }
      // splash-back droplets fall and shrink
      drops.forEach(d => {
        if (!d.life) return;
        d.age += dt; d.vy += 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
        d.r = d.r0 * (1 - clamp01(d.age / d.life));
      });
      for (let i = drops.length - 1; i >= 0; i--) if (drops[i].life && drops[i].age >= drops[i].life) drops.splice(i, 1);

      blob(head.x, head.y, head.r);
      drops.forEach(d => blob(d.x, d.y, d.r));

      // the ball: grows as the swirl closes, swells, then empties into the streams
      let core = 0;
      if (t >= 1.15 && t < T.burst + 0.05) core = R * 0.42 * easeOut(clamp01((t - 1.15) / 0.35));
      else if (t >= T.burst + 0.05) core = R * 0.5 * (1 - easeIn(clamp01((t - T.burst - 0.05) / 0.4)));
      blob(C.x, C.y, core);

      // 3. Six streams fly up; each lands, spreads into its tab and hands over to the real tab.
      tabs.forEach((tab, i) => {
        for (let j = 0; j < STREAM; j++) {
          const begin = T.burst + i * T.stagger + j * 0.016;
          const u = (t - begin) / T.flight;
          const key = i * STREAM + j;
          if (u >= 1 && j % 4 === 0 && !splashed.has(key)) {
            splashed.add(key);
            for (let n = 0; n < 3; n++) drops.push({ x: tab.x, y: tab.y, vx: rand(-160, 160), vy: rand(-220, -60), r: tab.h * rand(0.08, 0.16), r0: tab.h * rand(0.08, 0.16), age: 0, life: rand(0.3, 0.5) });
          }
          if (u <= 0 || u >= 1) continue;
          const e = easeInOut(u), [jx, jy] = streamJitter[key] || [0, 0];
          const x0 = C.x + jx * R * 0.12, y0 = C.y + jy * R * 0.12;
          const x = (1 - e) ** 2 * x0 + 2 * (1 - e) * e * tab.control.x + e * e * tab.x;
          const y = (1 - e) ** 2 * y0 + 2 * (1 - e) * e * tab.control.y + e * e * tab.y;
          blob(x, y, Math.max(tab.h * 0.14, tab.h * (0.5 - j * 0.022)));
        }
        const grow = (t - tab.landsAt) / T.grow;
        if (grow < 0) return;
        const k = clamp01(grow);
        if (k >= 1 && !tab.link.dataset.formed) tab.link.dataset.formed = 'true';
        const fade = clamp01((t - tab.landsAt - T.grow) / T.fade);
        if (fade >= 1) return;
        const ph = tab.h * (0.8 + 0.2 * k);
        pill(tab.x, tab.y, Math.max(ph, tab.h * 0.9 + (tab.w - tab.h * 0.9) * easeOutBack(k)), ph, 1 - fade);
      });

      if (render) render();
      else {
        flat.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
        flat.clearRect(0, 0, w, h);
        flat.fillStyle = '#1a9fd8';
        flat.beginPath();
        drops.forEach(d => { flat.moveTo(d.x + d.r, d.y); flat.arc(d.x, d.y, d.r, 0, Math.PI * 2); });
        if (core) { flat.moveTo(C.x + core, C.y); flat.arc(C.x, C.y, core, 0, Math.PI * 2); }
        flat.fill();
      }

      // 4. Once every tab has formed (and the hero picture has loaded), open the navy up onto the hero.
      const formedAt = (tabs.length ? tabs[tabs.length - 1].landsAt : T.burst + T.flight) + T.grow;
      if (!revealAt && t >= formedAt && (heroReady() || t > formedAt + 1.2)) {
        revealAt = t;
        root.dataset.splash = stage = 'reveal';
      }
      if (revealAt) {
        const k = easeInOut(clamp01((t - revealAt) / T.reveal));
        overlay.style.setProperty('--splash-hole', `${-160 + k * (Math.hypot(w, h) * 0.6 + 320)}px`);
        if (stage === 'reveal' && t - revealAt >= 0.35) root.dataset.splash = stage = 'text';
        if (t - revealAt >= T.reveal + 0.1) {
          delete root.dataset.splash;
          stage = 'done';
          return;
        }
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);

    // Nothing interrupts it: no scrolling, keys or taps while it plays.
    const block = event => {
      if (!root.dataset.splash) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const options = { passive: false, capture: true };
    ['wheel', 'touchmove', 'keydown'].forEach(type => window.addEventListener(type, block, options));
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      ['wheel', 'touchmove', 'keydown'].forEach(type => window.removeEventListener(type, block, options));
      window.removeEventListener('resize', resize);
      // unmounted part-way (React re-running effects in development): let the next mount play it from the start
      if (stage !== 'done') {
        root.dataset.splash = 'pending';
        tabs.forEach(tab => delete tab.link.dataset.formed);
        overlay.style.removeProperty('--splash-hole');
      }
    };
  }, []);

  return (
    <div ref={rootRef} className="splash-intro" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
