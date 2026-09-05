import { createClient } from '@supabase/supabase-js';
import IntroExperience from '@/components/IntroExperience';

async function getHeroImages() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const [{ data }, { data: settingRows }] = await Promise.all([
      supabase.from('site_images').select('key,image_url').eq('key', 'hero'),
      supabase.from('site_text').select('key,value').in('key', [
        'hero_stage_2_x', 'hero_stage_2_y', 'hero_stage_2_zoom',
        'hero_stage_3_x', 'hero_stage_3_y', 'hero_stage_3_zoom',
      ]),
    ]);
    const images = {};
    (data || []).forEach(item => { images[item.key] = item.image_url; });
    (settingRows || []).forEach(item => { images[item.key] = item.value; });
    return images;
  } catch { return {}; }
}

export default async function Hero() {
  const images = await getHeroImages();
  const cameraStages = {
    2: {
      x: Number(images.hero_stage_2_x || 72),
      y: Number(images.hero_stage_2_y || 35),
      zoom: Number(images.hero_stage_2_zoom || 1.32),
    },
    3: {
      x: Number(images.hero_stage_3_x || 28),
      y: Number(images.hero_stage_3_y || 48),
      zoom: Number(images.hero_stage_3_zoom || 1.48),
    },
  };

  return <IntroExperience heroImage={images.hero || ''} cameraStages={cameraStages} />;
}
