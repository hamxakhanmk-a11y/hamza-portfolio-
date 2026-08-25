import { createClient } from '@supabase/supabase-js';
import IntroExperience from '@/components/IntroExperience';

async function getHeroImages() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const [{ data }, { data: settingRows }] = await Promise.all([
      supabase.from('site_images').select('key,image_url').in('key', ['hero', 'hero_animated']),
      supabase.from('site_text').select('key,value').in('key', ['hero_animated_x', 'hero_animated_y', 'hero_animated_zoom']),
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
  };

  return <IntroExperience heroImage={heroImage} animatedImage={animatedHero} settings={settings} />;
}
