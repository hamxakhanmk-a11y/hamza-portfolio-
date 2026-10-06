'use client';

import { useEffect, useRef } from 'react';

const FISH_ARTWORK = '1787632591923-45abc927-9983-4e23-a0f9-78a020e6a361.png';
const VERTEX = `
attribute vec2 position;
uniform vec2 crop;
uniform vec2 focus;
uniform float time;
uniform float swimming;
varying vec2 uv;
vec2 rotatePoint(vec2 point, vec2 pivot, float angle) {
  vec2 delta = point - pivot;
  float c = cos(angle);
  float s = sin(angle);
  return pivot + vec2(delta.x * c - delta.y * s, delta.x * s + delta.y * c);
}
void main() {
  uv = position;
  vec2 p = position;
  if (swimming > 0.5) {
    float stroke = time * 1.8;
    float tail = smoothstep(0.69, 0.88, p.x) * smoothstep(0.43, 0.56, p.y);
    p = rotatePoint(p, vec2(0.72, 0.46), sin(stroke - 0.9) * 0.32 * tail);
    float fin = exp(-pow((position.x - 0.43) / 0.16, 4.0));
    fin *= smoothstep(0.62, 0.91, position.y);
    p = rotatePoint(p, vec2(0.37, 0.62), sin(stroke + 1.0) * 0.20 * fin);
    float rearFin = exp(-pow((position.x - 0.55) / 0.09, 4.0));
    rearFin *= smoothstep(0.60, 0.76, position.y) * (1.0 - smoothstep(0.82, 0.93, position.y));
    p = rotatePoint(p, vec2(0.51, 0.62), sin(stroke + 2.1) * 0.22 * rearFin);
    // A travelling spine wave drives the tail, while the rider follows the back.
    float spine = smoothstep(0.18, 0.75, position.x);
    p.y += sin(stroke - position.x * 5.5) * 0.023 * spine;
    p = rotatePoint(p, vec2(0.44, 0.48), sin(stroke * 0.5) * 0.022);
    p.y += sin(stroke * 0.5) * 0.018;
    p.x += cos(stroke * 0.5) * 0.008;
  }
  vec2 screen = (p - (1.0 - crop) * focus) / crop;
  gl_Position = vec4(screen.x * 2.0 - 1.0, 1.0 - screen.y * 2.0, 0.0, 1.0);
}`;
const FRAGMENT = `
precision mediump float;
uniform sampler2D artwork;
varying vec2 uv;
void main() {
  gl_FragColor = texture2D(artwork, uv);
}`;

export default function SwimmingArtwork({ src, imageRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!String(src).split(/[?#]/)[0].endsWith(FISH_ARTWORK)) return;
    const canvas = canvasRef.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false });
    if (!gl) return;

    let frame = 0;
    let visible = true;
    let ready = false;
    let disposed = false;
    let elapsed = 0;
    let previous = 0;
    const shaders = [];
    const program = gl.createProgram();
    const buffer = gl.createBuffer();
    const textures = [gl.createTexture(), gl.createTexture()];
    const images = [new Image(), new Image()];

    const cleanupResources = () => {
      textures.forEach(texture => gl.deleteTexture(texture));
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      shaders.forEach(shader => gl.deleteShader(shader));
    };

    for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]]) {
      const shader = gl.createShader(type);
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      cleanupResources();
      return;
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const mesh = [];
    const columns = 96;
    const rows = 48;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        const left = x / columns;
        const right = (x + 1) / columns;
        const top = y / rows;
        const bottom = (y + 1) / rows;
        mesh.push(left, top, right, top, left, bottom, left, bottom, right, top, right, bottom);
      }
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const cropLocation = gl.getUniformLocation(program, 'crop');
    const focusLocation = gl.getUniformLocation(program, 'focus');
    const timeLocation = gl.getUniformLocation(program, 'time');
    const swimmingLocation = gl.getUniformLocation(program, 'swimming');
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const draw = now => {
      frame = 0;
      if (disposed || !ready || !visible || document.hidden || motion.matches) return;
      elapsed += previous ? Math.min((now - previous) / 1000, 0.05) : 0;
      previous = now;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width && height) {
        const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
        const pixelWidth = Math.round(width * ratio);
        const pixelHeight = Math.round(height * ratio);
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
          canvas.width = pixelWidth;
          canvas.height = pixelHeight;
          gl.viewport(0, 0, pixelWidth, pixelHeight);
        }
        const scale = Math.max(width / 1361, height / 644);
        const focus = getComputedStyle(imageRef.current).objectPosition.split(' ').map(value => parseFloat(value) / 100);
        gl.uniform2f(cropLocation, width / (1361 * scale), height / (644 * scale));
        gl.uniform2f(focusLocation, focus[0], focus[1]);
        gl.uniform1f(timeLocation, elapsed);
        gl.clear(gl.COLOR_BUFFER_BIT);
        textures.forEach((texture, index) => {
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.uniform1f(swimmingLocation, index);
          gl.drawArrays(gl.TRIANGLES, 0, mesh.length / 2);
        });
        canvas.style.opacity = '1';
      }
      frame = window.requestAnimationFrame(draw);
    };
    const resume = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      if (motion.matches) canvas.style.opacity = '0';
      if (ready && visible && !document.hidden && !motion.matches) frame = window.requestAnimationFrame(draw);
    };
    let loaded = 0;
    images.forEach((image, index) => {
      image.onload = () => {
        if (disposed) return;
        gl.bindTexture(gl.TEXTURE_2D, textures[index]);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        try {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
          loaded += 1;
          ready = loaded === images.length;
          if (ready) resume();
        } catch {
          canvas.style.opacity = '0';
        }
      };
    });
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      resume();
    });
    observer.observe(canvas);
    const loseContext = event => {
      event.preventDefault();
      ready = false;
      canvas.style.opacity = '0';
      resume();
    };
    canvas.addEventListener('webglcontextlost', loseContext);
    document.addEventListener('visibilitychange', resume);
    motion.addEventListener('change', resume);
    images[0].src = '/hero-animation/water-background.webp';
    images[1].src = '/hero-animation/fish-foreground.webp';

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', resume);
      motion.removeEventListener('change', resume);
      canvas.removeEventListener('webglcontextlost', loseContext);
      images.forEach(image => { image.onload = null; });
      canvas.style.opacity = '0';
      cleanupResources();
    };
  }, [src, imageRef]);

  return <canvas ref={canvasRef} className="intro-swimming-artwork" aria-hidden="true" />;
}
