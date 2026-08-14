import { createClient } from '@supabase/supabase-js';
import { siteConfig } from '@/data/config';

async function getHeroImage() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data } = await supabase.from('site_images').select('image_url').eq('key', 'hero').single();
    return data?.image_url || '';
  } catch { return ''; }
}

export default async function Hero() {
  const heroImage = await getHeroImage();

  return (
    <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-neutral-300">
        {heroImage && (
          <img src={heroImage} alt="Hero artwork" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/25" />
      </div>

      {/* Text */}
      <div className="relative z-10 text-center px-6 flex flex-col items-center gap-5">
        <p className="text-white/75 text-xs tracking-[0.4em] uppercase">Original Artworks</p>
        <h1
          className="text-white text-6xl md:text-8xl font-light leading-[1.02] drop-shadow-sm"
          style={{ fontFamily: 'var(--font-cormorant)' }}
        >
          {siteConfig.artistName}
        </h1>
        <p className="text-white/70 text-base max-w-sm leading-relaxed">{siteConfig.tagline}</p>
        <a
          href="#gallery"
          className="mt-4 border border-white/80 text-white text-xs tracking-[0.25em] uppercase px-10 py-3.5 hover:bg-white hover:text-neutral-900 transition-colors"
        >
          View Works
        </a>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-white/40 text-xs tracking-widest uppercase">Scroll</span>
        <div className="w-px h-8 bg-white/25" />
      </div>

      {!heroImage && (
        <p className="absolute bottom-4 right-4 text-white/30 text-xs">
          Upload a hero photo in Admin → Site Photos
        </p>
      )}
    </section>
  );
}
