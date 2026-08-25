'use client';

import { useRef } from 'react';

export default function HeroReveal({ normalImage, animatedImage, settings }) {
  const revealRef = useRef(null);

  function updateReveal(event) {
    const layer = revealRef.current;
    if (!layer) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    layer.style.setProperty('--reveal-x', `${event.clientX - bounds.left}px`);
    layer.style.setProperty('--reveal-y', `${event.clientY - bounds.top}px`);
    layer.style.opacity = '1';
  }

  function hideReveal() {
    if (revealRef.current) revealRef.current.style.opacity = '0';
  }

  const animatedIsVideo = /\.(mp4|webm)(?:\?|$)/i.test(animatedImage || '');

  return (
    <div
      className="absolute inset-0 bg-neutral-300"
      onPointerEnter={updateReveal}
      onPointerMove={updateReveal}
      onPointerLeave={hideReveal}
      onPointerUp={hideReveal}
    >
      {normalImage && <img src={normalImage} alt="Hero artwork" className="h-full w-full object-cover" />}
      {animatedImage && (
        <div
          ref={revealRef}
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
          style={{
            '--reveal-x': '50%',
            '--reveal-y': '50%',
            '--reveal-size': `${settings.revealSize}px`,
            maskImage: 'radial-gradient(circle var(--reveal-size) at var(--reveal-x) var(--reveal-y), black 0%, black 55%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(circle var(--reveal-size) at var(--reveal-x) var(--reveal-y), black 0%, black 55%, transparent 100%)',
          }}
        >
          {animatedIsVideo ? (
            <video
              src={animatedImage}
              muted loop autoPlay playsInline preload="auto"
              className="h-full w-full object-cover"
              style={{ objectPosition: `${settings.x}% ${settings.y}%`, transform: `scale(${settings.zoom})` }}
            />
          ) : (
            <img
              src={animatedImage}
              alt="Animated detail of the hero artwork"
              className="h-full w-full object-cover"
              style={{ objectPosition: `${settings.x}% ${settings.y}%`, transform: `scale(${settings.zoom})` }}
            />
          )}
        </div>
      )}
    </div>
  );
}
