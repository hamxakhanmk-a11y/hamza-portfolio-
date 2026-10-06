'use client';

import { useEffect, useRef } from 'react';

const FISH_ARTWORK = '1787632591923-45abc927-9983-4e23-a0f9-78a020e6a361.png';
const VERTEX = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = vec2((position.x + 1.0) * 0.5, (1.0 - position.y) * 0.5);
  gl_Position = vec4(position, 0.0, 1.0);
}`;
const FRAGMENT = `
precision mediump float;
uniform sampler2D artwork;
uniform vec2 crop;
uniform vec2 focus;
uniform float time;
varying vec2 uv;
void main() {
  vec2 p = uv * crop + (1.0 - crop) * focus;
  // Soft masks keep the motion inside the creature's silhouette.
  float bodyLine = 0.35 + 0.31 * sin(clamp((p.x - 0.12) / 0.66, 0.0, 1.0) * 3.14159);
  float body = exp(-pow((p.y - bodyLine) / 0.13, 4.0));
  body *= smoothstep(0.08, 0.23, p.x) * (1.0 - smoothstep(0.67, 0.78, p.x));
  float tail = exp(-pow((p.x - 0.80) / 0.115, 4.0) - pow((p.y - 0.65) / 0.23, 4.0));
  tail *= smoothstep(0.49, 0.59, p.y);
  float fin = exp(-pow((p.x - 0.43) / 0.12, 4.0) - pow((p.y - 0.80) / 0.14, 4.0));
  float stroke = time * 1.65;
  p.y += body * sin(stroke - p.x * 7.0) * 0.008;
  p.x += tail * sin(stroke - p.y * 5.0) * 0.018;
  p.y += tail * sin(stroke - p.y * 5.0 + 0.8) * 0.012;
  p.x += fin * sin(stroke + 1.7) * 0.008;
  gl_FragColor = texture2D(artwork, clamp(p, 0.0, 1.0));
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
    const texture = gl.createTexture();
    const image = new Image();
    image.crossOrigin = 'anonymous';

    const cleanupResources = () => {
      gl.deleteTexture(texture);
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
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const cropLocation = gl.getUniformLocation(program, 'crop');
    const focusLocation = gl.getUniformLocation(program, 'focus');
    const timeLocation = gl.getUniformLocation(program, 'time');

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
        const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
        const focus = getComputedStyle(imageRef.current).objectPosition.split(' ').map(value => parseFloat(value) / 100);
        gl.uniform2f(cropLocation, width / (image.naturalWidth * scale), height / (image.naturalHeight * scale));
        gl.uniform2f(focusLocation, focus[0], focus[1]);
        gl.uniform1f(timeLocation, elapsed);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
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
    image.onload = () => {
      if (disposed) return;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        ready = true;
        resume();
      } catch {
        canvas.style.opacity = '0';
      }
    };
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
    image.src = src;

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', resume);
      motion.removeEventListener('change', resume);
      canvas.removeEventListener('webglcontextlost', loseContext);
      image.onload = null;
      canvas.style.opacity = '0';
      cleanupResources();
    };
  }, [src, imageRef]);

  return <canvas ref={canvasRef} className="intro-swimming-artwork" aria-hidden="true" />;
}
