'use client';

import { useRef } from 'react';

export default function HeroMotion({ imageUrl }) {
  const heroRef = useRef(null);

  function moveDepth(event) {
    const hero = heroRef.current;
    if (!hero) return;
    const bounds = hero.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    hero.style.setProperty('--hero-x', `${x * -1.1}%`);
    hero.style.setProperty('--hero-y', `${y * -0.8}%`);
    hero.style.setProperty('--light-x', `${50 + x * 18}%`);
    hero.style.setProperty('--light-y', `${45 + y * 14}%`);
  }

  function resetDepth() {
    const hero = heroRef.current;
    if (!hero) return;
    hero.style.setProperty('--hero-x', '0%');
    hero.style.setProperty('--hero-y', '0%');
    hero.style.setProperty('--light-x', '50%');
    hero.style.setProperty('--light-y', '45%');
  }

  return (
    <section
      ref={heroRef}
      onPointerMove={moveDepth}
      onPointerLeave={resetDepth}
      className="animated-hero relative flex min-h-[72svh] w-full items-center justify-center overflow-hidden bg-neutral-300 sm:min-h-[85svh] lg:min-h-screen"
      aria-label="Animated featured artwork"
    >
      {imageUrl ? (
        <>
          <div className="hero-artwork absolute -inset-[4%]">
            <img src={imageUrl} alt="Featured artwork" className="h-full w-full object-cover" />
          </div>
          <div className="hero-breathe pointer-events-none absolute -inset-[3%] opacity-25 mix-blend-soft-light">
            <img src={imageUrl} alt="" aria-hidden="true" className="h-full w-full object-cover blur-[1px]" />
          </div>
          <div className="hero-light pointer-events-none absolute inset-0" />
          <div className="hero-vignette pointer-events-none absolute inset-0" />
          <div className="hero-particle hero-particle-one" />
          <div className="hero-particle hero-particle-two" />
          <div className="hero-particle hero-particle-three" />
        </>
      ) : (
        <p className="absolute bottom-4 right-4 text-xs text-white/40">
          Upload a hero photo in Admin → Site Photos
        </p>
      )}
    </section>
  );
}
