import { createClient } from '@supabase/supabase-js';
import HeroReveal from '@/components/HeroReveal';

async function getHeroImages() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const [{ data }, { data: settingRows }] = await Promise.all([
      supabase.from('site_images').select('key,image_url').in('key', ['hero', 'hero_animated']),
      supabase.from('site_text').select('key,value').in('key', ['hero_animated_x', 'hero_animated_y', 'hero_animated_zoom', 'hero_reveal_size']),
    ]);
    const images = {};
    (data || []).forEach(item => { images[item.key] = item.image_url; });
    (settingRows || []).forEach(item => { images[item.key] = item.value; });
    return images;
  } catch { return {}; }
}

export default async function Hero() {
  const images = await getHeroImages();
  const heroImage = images.hero || images.hero_animated || '';
  const animatedHero = images.hero_animated || '';
  const settings = {
    x: Number(images.hero_animated_x || 50),
    y: Number(images.hero_animated_y || 50),
    zoom: Number(images.hero_animated_zoom || 1),
    revealSize: Number(images.hero_reveal_size || 150),
  };

  return (
    <section className="relative flex min-h-[72svh] w-full items-center justify-center overflow-hidden sm:min-h-[85svh] lg:min-h-screen">
      {/* Background */}
      <HeroReveal normalImage={heroImage} animatedImage={animatedHero} settings={settings} />

      {heroImage && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 sm:h-36">
          <div
            className="absolute inset-0 backdrop-blur-md"
            style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 72%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 72%)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/55 to-white" />
        </div>
      )}

      {!heroImage && (
        <p className="absolute bottom-4 right-4 text-white/30 text-xs">
          Upload a hero photo in Admin → Site Photos
        </p>
      )}
    </section>
  );
}
