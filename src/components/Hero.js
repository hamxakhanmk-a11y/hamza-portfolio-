import { createClient } from '@supabase/supabase-js';
import IntroExperience from '@/components/IntroExperience';
import { siteConfig } from '@/data/config';

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
        'hero_stage_4_x', 'hero_stage_4_y', 'hero_stage_4_zoom',
        'hero_stage_1_eyebrow', 'hero_stage_1_title',
        'hero_stage_2_eyebrow', 'hero_stage_2_title',
        'hero_stage_3_eyebrow', 'hero_stage_3_title',
        'hero_stage_4_eyebrow', 'hero_stage_4_title',
        'hero_stage_1_text_x', 'hero_stage_1_text_y',
        'hero_stage_2_text_x', 'hero_stage_2_text_y',
        'hero_stage_3_text_x', 'hero_stage_3_text_y',
        'hero_stage_4_text_x', 'hero_stage_4_text_y',
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
    4: {
      x: Number(images.hero_stage_4_x || 50),
      y: Number(images.hero_stage_4_y || 50),
      zoom: Number(images.hero_stage_4_zoom || 1),
    },
  };
  const heroText = {
    1: {
      eyebrow: images.hero_stage_1_eyebrow || 'Original Artworks',
      title: images.hero_stage_1_title || siteConfig.artistName,
      x: Number(images.hero_stage_1_text_x || 50),
      y: Number(images.hero_stage_1_text_y || 52),
    },
    2: {
      eyebrow: images.hero_stage_2_eyebrow || 'Painted with intention',
      title: images.hero_stage_2_title || 'Where imagination flows',
      x: Number(images.hero_stage_2_text_x || 76),
      y: Number(images.hero_stage_2_text_y || 50),
    },
    3: {
      eyebrow: images.hero_stage_3_eyebrow || 'Dhikr through observation',
      title: images.hero_stage_3_title || 'Painting becomes a form of praise',
      x: Number(images.hero_stage_3_text_x || 50),
      y: Number(images.hero_stage_3_text_y || 50),
    },
    4: {
      eyebrow: images.hero_stage_4_eyebrow || 'Enter the',
      title: images.hero_stage_4_title || 'Collection',
      x: Number(images.hero_stage_4_text_x || 50),
      y: Number(images.hero_stage_4_text_y || 50),
    },
  };

  return <IntroExperience heroImage={images.hero || ''} cameraStages={cameraStages} heroText={heroText} />;
}
