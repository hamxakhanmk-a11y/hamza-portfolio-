'use client';

import { useEffect, useRef } from 'react';

const BLOCKED_SURFACES = [
  'a',
  'button',
  'input',
  'textarea',
  'select',
  'label',
  'img',
  'video',
  'svg',
  '[role="button"]',
  '[data-water-surface-block]',
].join(',');

export default function WaterSurface() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const supportsFinePointer = window.matchMedia('(pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canvas || !supportsFinePointer || prefersReducedMotion) return undefined;

    const context = canvas.getContext('2d');
    if (!context) return undefined;

    const ripples = [];
    let frameId = 0;
    let lastPoint = null;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = (now) => {
      context.clearRect(0, 0, width, height);
      const activeRipples = ripples.filter((ripple) => now - ripple.startedAt < 1500);
      ripples.splice(0, ripples.length, ...activeRipples);

      activeRipples.forEach((ripple) => {
        const progress = (now - ripple.startedAt) / 1500;
        const eased = 1 - (1 - progress) ** 3;
        const opacity = (1 - progress) ** 1.7;
        const radius = 18 + eased * ripple.size;

        const glow = context.createRadialGradient(
          ripple.x,
          ripple.y,
          radius * 0.15,
          ripple.x,
          ripple.y,
          radius,
        );
        glow.addColorStop(0, `rgba(255, 250, 242, ${0.065 * opacity})`);
        glow.addColorStop(0.52, `rgba(109, 205, 222, ${0.042 * opacity})`);
        glow.addColorStop(1, 'rgba(109, 205, 222, 0)');
        context.fillStyle = glow;
        context.beginPath();
        context.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
        context.fill();

        context.lineWidth = 1.1 - progress * 0.45;
        context.strokeStyle = `rgba(92, 189, 210, ${0.19 * opacity})`;
        context.beginPath();
        context.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
        context.stroke();

        context.lineWidth = 0.75;
        context.strokeStyle = `rgba(237, 113, 137, ${0.12 * opacity})`;
        context.beginPath();
        context.arc(ripple.x, ripple.y, radius * 0.64, 0, Math.PI * 2);
        context.stroke();
      });

      if (activeRipples.length) frameId = window.requestAnimationFrame(draw);
      else frameId = 0;
    };

    const addRipple = (x, y, speed = 0) => {
      ripples.push({
        x,
        y,
        size: Math.min(150, 88 + speed * 1.15),
        startedAt: performance.now(),
      });
      if (ripples.length > 5) ripples.shift();
      if (!frameId) frameId = window.requestAnimationFrame(draw);
    };

    const onPointerMove = (event) => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest(BLOCKED_SURFACES)) {
        lastPoint = null;
        return;
      }

      const point = { x: event.clientX, y: event.clientY };
      if (!lastPoint) {
        lastPoint = point;
        addRipple(point.x, point.y);
        return;
      }

      const distance = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
      if (distance < 52) return;
      addRipple(point.x, point.y, distance);
      lastPoint = point;
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="water-surface" aria-hidden="true" />;
}
