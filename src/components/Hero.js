import { createClient } from '@supabase/supabase-js';

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
    <section className="relative flex min-h-[72svh] w-full items-center justify-center overflow-hidden sm:min-h-[85svh] lg:min-h-screen">
      {/* Background */}
      <div className="absolute inset-0 bg-neutral-300">
        {heroImage && (
          <img src={heroImage} alt="Hero artwork" className="w-full h-full object-cover" />
        )}
      </div>

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
