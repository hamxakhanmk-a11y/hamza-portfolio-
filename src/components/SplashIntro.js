'use client';

import { useEffect, useRef } from 'react';

// The home page's opening on a fresh visit (first arrival or refresh): on a navy screen a raindrop of vivid
// blue liquid falls and splashes on the ground, the splash is swept up into a wide circular swirl that
// closes into a ball, and the ball bursts into six streams that fly up and become the page tabs. The navy
// then opens up to reveal the hero, and the letters of the title rise one by one from the bottom into place.
//
// The layout's head script marks <html data-splash="pending"> before the first paint on a full load of
// "/", so client-side visits to Home never replay it. The stages are driven through that attribute
// (pending → liquid → reveal → text → removed) and styled in globals.css.
//
// Liquid: every droplet is splatted as soft blobs into a small "field" canvas, stretched along the way it
// moves (like a real drop in flight); a WebGL pass thresholds the field, so nearby blobs merge like liquid,
// and shades it as water in the tabs' blues.

const FIELD_SCALE = 0.35; // field resolution, before rounding up to a power of two for its mipmaps
const pow2 = x => 2 ** Math.ceil(Math.log2(Math.max(2, x)));
const T = {
  dropStart: 0.25, impact: 1.05, swirlStart: 1.85, swirlEnd: 3.05, burst: 3.1,
  stagger: 0.08, flight: 0.68, grow: 0.3, fade: 0.45, reveal: 1.2, rise: 1.6, letterGap: 0.07,
};
const STREAM = 16; // droplets per tab stream

const clamp01 = x => Math.max(0, Math.min(1, x));
const easeInOut = x => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const easeIn = x => x * x * x;
const easeOut = x => 1 - (1 - x) ** 3;
const easeOutBack = x => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2;
const rand = (a, b) => a + Math.random() * (b - a);

const VERTEX = `attribute vec2 p; varying vec2 uv; void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
// Water in the tabs' colours (deep #063a5b → #0879aa → #1a9fc5 with a pale cyan shimmer). Blurred copies
// of the field (its mipmaps) give each shape a smooth rounded surface, so it reads as a body of water: a
// bright glint where light hits, a thin darker outline, light gathering inside the far edge, a little
// see-through where thin, and a slow shimmer moving across it.
const FRAGMENT = `precision mediump float;
uniform sampler2D field; uniform vec2 texel; uniform float time; varying vec2 uv;
float f(vec2 o, float blur) { return texture2D(field, uv + o, blur).r; }
void main() {
  float v = f(vec2(0.0), 0.0);
  float a = smoothstep(0.44, 0.52, v);
  if (a <= 0.0) { gl_FragColor = vec4(0.0); return; }
  float height = clamp(f(vec2(0.0), 3.5) * 0.55 + f(vec2(0.0), 5.0) * 0.45, 0.0, 1.0);
  vec2 d = texel * 2.5;
  float hx = f(vec2(d.x, 0.0), 3.5) - f(vec2(-d.x, 0.0), 3.5);
  float hy = f(vec2(0.0, d.y), 3.5) - f(vec2(0.0, -d.y), 3.5);
  float ex = f(vec2(texel.x, 0.0), 0.0) - f(vec2(-texel.x, 0.0), 0.0);
  float ey = f(vec2(0.0, texel.y), 0.0) - f(vec2(0.0, -texel.y), 0.0);
  vec3 n = normalize(vec3(-(hx * 3.0 + ex * 1.4), -(hy * 3.0 + ey * 1.4), 1.0));
  vec3 light = normalize(vec3(-0.5, 0.55, 0.7));
  float diffuse = max(dot(n, light), 0.0);
  float spec = pow(max(dot(reflect(-light, n), vec3(0.0, 0.0, 1.0)), 0.0), 90.0);
  float sheen = pow(max(dot(reflect(-light, n), vec3(0.0, 0.0, 1.0)), 0.0), 12.0);
  float rim = 1.0 - smoothstep(0.46, 0.6, v);
  float through = pow(1.0 - n.z, 1.2) * max(dot(normalize(n.xy + 0.0001), -light.xy), 0.0);
  vec3 deep = vec3(0.024, 0.227, 0.357), ocean = vec3(0.031, 0.475, 0.667), sea = vec3(0.102, 0.624, 0.773);
  vec3 cyan = vec3(0.22, 0.74, 0.97), pale = vec3(0.73, 0.90, 0.99);
  vec3 col = mix(sea, ocean, smoothstep(0.35, 1.0, height));   // thicker water looks deeper
  col = mix(col, deep, (1.0 - diffuse) * 0.45);
  col += cyan * through * 0.7 + pale * sheen * 0.18;
  float band = sin(dot(gl_FragCoord.xy, vec2(0.011, 0.004)) - time * 2.2) * 0.5 + 0.5;
  col = mix(col, pale, pow(band, 6.0) * height * 0.25);
  col = mix(col, deep * 0.7, rim * 0.75);
  float alpha = a * mix(0.75, 0.95, smoothstep(0.3, 0.9, height));
  gl_FragColor = vec4(col * alpha + vec3(spec) * a, min(1.0, alpha + spec * a));
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
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const texel = gl.getUniformLocation(program, 'texel');
  const time = gl.getUniformLocation(program, 'time');
  return seconds => {
    gl.uniform1f(time, seconds);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(texel, 1 / field.width, 1 / field.height);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, field);
    gl.generateMipmap(gl.TEXTURE_2D);
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
    root.dataset.splashPlayed = 'true'; // stays: the title's letters keep their rise-from-below animation
    const overlay = rootRef.current, canvas = canvasRef.current;
    const field = document.createElement('canvas');
    const fctx = field.getContext('2d');
    const sprite = createSprite();
    const render = createRenderer(canvas, field);
    const flat = render ? null : canvas.getContext('2d');

    let fx = FIELD_SCALE, fy = FIELD_SCALE;
    let w = 0, h = 0, C = { x: 0, y: 0 }, G = 0, R = 0, tabs = [], frame = 0, t = 0, last = 0;
    let revealAt = 0, textAt = 0, stage = 'liquid';
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      field.width = pow2(w * FIELD_SCALE); field.height = pow2(h * FIELD_SCALE);
      fx = field.width / w; fy = field.height / h;
      C = { x: w / 2, y: h * 0.52 };
      R = Math.min(w, h) * 0.22;
      G = C.y + R * 0.75; // the "ground" the raindrop lands on
      tabs = measureTabs();
      tabs.forEach((tab, i) => {
        // each stream curves out to the side, then up into its tab
        const s = tab.x - C.x;
        tab.control = { x: tab.x + s * 0.35, y: C.y + (tab.y - C.y) * 0.35 };
        tab.landsAt = T.burst + i * T.stagger + T.flight;
      });
    };
    resize();

    const drops = []; // free droplets: the ground splash, the swirl and the splash-back at the tabs
    let splashStarted = false, swirlStarted = false, sprayed = 0;
    const streamJitter = Array.from({ length: tabs.length * STREAM }, () => [rand(-1, 1), rand(-1, 1)]);
    const splashed = new Set();

    const blob = (x, y, r, strength = 1) => {
      if (r <= 0.3) return;
      fctx.globalAlpha = strength;
      const sx = r * 2 * fx, sy = r * 2 * fy;
      fctx.drawImage(sprite, x * fx - sx, y * fy - sy, sx * 2, sy * 2);
    };
    // A drop in motion: a round head with a tapering tail stretched back along its velocity.
    const streak = (x, y, vx, vy, r, strength = 1) => {
      const speed = Math.hypot(vx, vy);
      const length = Math.min(r * 5, speed * 0.045);
      if (length < r * 0.4) { blob(x, y, r, strength); return; }
      const ux = vx / speed, uy = vy / speed, n = Math.ceil(length / (r * 0.4));
      for (let i = n; i >= 0; i--) {
        const k = i / n;
        blob(x - ux * length * k, y - uy * length * k, r * (1 - 0.65 * k), strength * (i ? 0.72 : 0.9));
      }
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

      // 1. A raindrop falls, stretching as it speeds up, and hits the ground below the centre.
      if (t >= T.dropStart && t < T.impact) {
        const span = T.impact - T.dropStart, k = clamp01((t - T.dropStart) / span), fall = G + R * 0.5;
        streak(C.x, -R * 0.5 + fall * easeIn(k), 0, (fall * 3 * k * k) / span, R * 0.11);
      }
      // 2. It splashes on the ground: a crown of drops flies up and out and skips along the ground,
      // a puddle spreads, and a small jet bounces up from where it hit.
      if (t >= T.impact && !splashStarted) {
        splashStarted = true;
        for (let n = 0; n < 54; n++) {
          const angle = Math.PI * (0.06 + 0.88 * Math.random()), speed = R * rand(2.2, 4.8);
          const big = n < 8;
          drops.push({ x: C.x + rand(-8, 8), y: G, vx: Math.cos(angle) * speed * 1.35, vy: -Math.sin(angle) * speed, r: R * (big ? rand(0.07, 0.1) : rand(0.025, 0.065)) });
        }
      }
      if (splashStarted && !swirlStarted) {
        drops.forEach(d => {
          d.vy += R * 9 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= Math.exp(-1.1 * dt);
          if (d.y > G) { d.y = G; d.vy *= -0.3; d.vx *= 0.75; }
        });
        const k = clamp01((t - T.impact) / 0.7);
        pill(C.x, G, R * (0.3 + 2.4 * easeOut(k)), R * 0.1 * (1 - 0.5 * k), 1);
        const jet = clamp01((t - T.impact - 0.06) / 0.5);
        if (jet > 0 && jet < 1) {
          const height = R * 0.85 * Math.sin(Math.PI * jet);
          for (let n = 0; n <= 5; n++) blob(C.x, G - height * n / 5, R * (0.06 - 0.006 * n));
        }
      }
      // 3. The splash is swept up into a wide circular swirl round the centre, which then closes into a ball.
      if (t >= T.swirlStart && !swirlStarted) {
        swirlStarted = true;
        const width = R * 2.6;
        for (let n = 0; n < 14; n++) drops.push({ x: C.x - width / 2 + width * n / 13, y: G, r: R * 0.06 }); // the puddle lifts too
        for (let n = 0; n < 3; n++) drops.push({ x: C.x + Math.cos(n * 2.1) * R, y: C.y + Math.sin(n * 2.1) * R, r: R * 0.1 }); // heavier strokes lead the swirl
        drops.forEach(d => {
          d.angle = Math.atan2(d.y - C.y, d.x - C.x); d.radius = Math.hypot(d.x - C.x, d.y - C.y); d.r0 = d.r;
          d.ring = R * 1.2 * rand(0.75, 1.25); // a broken ring of strokes, not one smooth band
        });
      }
      if (swirlStarted && t < T.swirlEnd) {
        const k = clamp01((t - T.swirlStart) / (T.swirlEnd - T.swirlStart));
        drops.forEach(d => {
          if (d.life) return;
          const px = d.x, py = d.y;
          d.angle += dt * (3.2 + 4 * k);
          // first gathered onto a wide ring, then the ring closes in
          const radius = k < 0.55 ? d.radius + (d.ring - d.radius) * easeOut(k / 0.55) : d.ring * (1 - easeIn((k - 0.55) / 0.45));
          d.x = C.x + Math.cos(d.angle) * radius; d.y = C.y + Math.sin(d.angle) * radius;
          if (dt) { d.vx = (d.x - px) / dt; d.vy = (d.y - py) / dt; }
          d.r = d.r0 * (1 + 0.4 * Math.sin(Math.PI * k));
        });
      }
      // fine spray flung off the spinning ring
      if (swirlStarted && t < T.swirlEnd - 0.25) {
        const ring = drops.filter(d => !d.life);
        for (const due = Math.floor((t - T.swirlStart) * 45); sprayed < due && ring.length; sprayed++) {
          const d = ring[Math.floor(Math.random() * ring.length)], out = rand(30, 110);
          const ox = Math.cos(d.angle), oy = Math.sin(d.angle);
          drops.push({ x: d.x, y: d.y, vx: (d.vx || 0) * 0.55 + ox * out, vy: (d.vy || 0) * 0.55 + oy * out, r: R * rand(0.012, 0.032), r0: R * rand(0.012, 0.032), age: 0, life: rand(0.5, 0.9), spray: true });
        }
      }
      if (swirlStarted && t >= T.swirlEnd) {
        for (let i = drops.length - 1; i >= 0; i--) if (!drops[i].life) drops.splice(i, 1);
      }
      // spray drifts and splash-back droplets at the tabs fall; both shrink away
      drops.forEach(d => {
        if (!d.life) return;
        d.age += dt;
        if (d.spray) { const drag = Math.exp(-1.6 * dt); d.vx *= drag; d.vy *= drag; } else d.vy += 900 * dt;
        d.x += d.vx * dt; d.y += d.vy * dt;
        d.r = d.r0 * (1 - clamp01(d.age / d.life));
      });
      for (let i = drops.length - 1; i >= 0; i--) if (drops[i].life && drops[i].age >= drops[i].life) drops.splice(i, 1);

      drops.forEach(d => streak(d.x, d.y, d.vx || 0, d.vy || 0, d.r));

      // the ball: grows as the swirl closes, swells, then empties into the streams
      let core = 0;
      if (t >= T.swirlEnd - 0.4 && t < T.burst + 0.05) core = R * 0.36 * easeOut(clamp01((t - T.swirlEnd + 0.4) / 0.45));
      else if (t >= T.burst + 0.05) core = R * 0.42 * (1 - easeIn(clamp01((t - T.burst - 0.05) / 0.55)));
      blob(C.x, C.y, core);

      // 4. Six streams fly up; each lands, spreads into its tab and hands over to the real tab.
      tabs.forEach((tab, i) => {
        for (let j = 0; j < STREAM; j++) {
          const begin = T.burst + i * T.stagger + j * 0.02;
          const u = (t - begin) / T.flight;
          const key = i * STREAM + j;
          if (u >= 1 && j % 4 === 0 && !splashed.has(key)) {
            splashed.add(key);
            for (let n = 0; n < 3; n++) drops.push({ x: tab.x, y: tab.y, vx: rand(-160, 160), vy: rand(-220, -60), r: tab.h * rand(0.08, 0.16), r0: tab.h * rand(0.08, 0.16), age: 0, life: rand(0.35, 0.6) });
          }
          if (u <= 0 || u >= 1) continue;
          const e = easeInOut(u), [jx, jy] = streamJitter[key] || [0, 0];
          const x0 = C.x + jx * R * 0.12, y0 = C.y + jy * R * 0.12;
          const x = (1 - e) ** 2 * x0 + 2 * (1 - e) * e * tab.control.x + e * e * tab.x;
          const y = (1 - e) ** 2 * y0 + 2 * (1 - e) * e * tab.control.y + e * e * tab.y;
          // direction of travel along the curve, for the stretch
          const speed = (u < 0.5 ? 4 * u : 4 * (1 - u)) / T.flight;
          const vx = (2 * (1 - e) * (tab.control.x - x0) + 2 * e * (tab.x - tab.control.x)) * speed;
          const vy = (2 * (1 - e) * (tab.control.y - y0) + 2 * e * (tab.y - tab.control.y)) * speed;
          streak(x, y, vx, vy, Math.min(R * 0.1, Math.max(tab.h * 0.14, tab.h * (0.48 - j * 0.02))));
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

      if (render) render(t);
      else {
        flat.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
        flat.clearRect(0, 0, w, h);
        flat.fillStyle = '#0879aa';
        flat.beginPath();
        drops.forEach(d => { flat.moveTo(d.x + d.r, d.y); flat.arc(d.x, d.y, d.r, 0, Math.PI * 2); });
        if (core) { flat.moveTo(C.x + core, C.y); flat.arc(C.x, C.y, core, 0, Math.PI * 2); }
        flat.fill();
      }

      // 5. Once every tab has formed (and the hero picture has loaded), open the navy up onto the hero,
      // then the title's letters rise from the bottom into place.
      const formedAt = (tabs.length ? tabs[tabs.length - 1].landsAt : T.burst + T.flight) + T.grow;
      if (!revealAt && t >= formedAt && (heroReady() || t > formedAt + 0.6)) {
        revealAt = t;
        root.dataset.splash = stage = 'reveal';
      }
      if (revealAt) {
        const k = easeInOut(clamp01((t - revealAt) / T.reveal));
        overlay.style.setProperty('--splash-hole', `${-160 + k * (Math.hypot(w, h) * 0.6 + 320)}px`);
        if (stage === 'reveal' && t - revealAt >= 0.5) {
          root.dataset.splash = stage = 'text';
          textAt = t;
        }
        const letters = document.querySelectorAll('.intro-letter-line span').length;
        if (textAt && t - textAt >= T.rise + letters * T.letterGap + 0.1 && t - revealAt >= T.reveal) {
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
