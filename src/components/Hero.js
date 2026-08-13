import { siteConfig } from '@/data/config';

export default function Hero() {
  return (
    <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">

      {/* Background image — add your painting to /public/images/hero.jpg */}
      <div className="absolute inset-0 bg-neutral-200">
        <img
          src="/images/hero.jpg"
          alt="Hero artwork"
          className="w-full h-full object-cover"
        />
        {/* Subtle dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Centered text */}
      <div className="relative z-10 text-center px-6 flex flex-col items-center gap-5">
        <p className="text-white/80 text-xs tracking-[0.4em] uppercase">
          Original Artworks
        </p>
        <h1
          className="text-white text-6xl md:text-8xl font-light leading-[1.05] drop-shadow-sm"
          style={{ fontFamily: 'var(--font-cormorant)' }}
        >
          {siteConfig.artistName}
        </h1>
        <p className="text-white/75 text-base max-w-sm leading-relaxed">
          {siteConfig.tagline}
        </p>
        <a
          href="#gallery"
          className="mt-4 border border-white text-white text-xs tracking-[0.25em] uppercase px-10 py-3.5 hover:bg-white hover:text-neutral-900 transition-colors"
        >
          View Works
        </a>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-white/50 text-xs tracking-widest uppercase">Scroll</span>
        <div className="w-px h-8 bg-white/30" />
      </div>
    </section>
  );
}
