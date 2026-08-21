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
    <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-neutral-300">
        {heroImage && (
          <img src={heroImage} alt="Hero artwork" className="w-full h-full object-cover" />
        )}
      </div>

      {!heroImage && (
        <p className="absolute bottom-4 right-4 text-white/30 text-xs">
          Upload a hero photo in Admin → Site Photos
        </p>
      )}
    </section>
  );
}
