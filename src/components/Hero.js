import { createClient } from '@supabase/supabase-js';
import LivingPaintingHero from '@/components/LivingPaintingHero';

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

  return <LivingPaintingHero imageUrl={heroImage} />;
}
