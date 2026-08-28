import { createClient } from '@supabase/supabase-js';
import { siteConfig } from '@/data/config';
import AboutTabs from '@/components/AboutTabs';

async function getAboutData() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const [textRes, imagesRes, legacyHero] = await Promise.all([
      supabase.from('site_text').select('key,value'),
      supabase.from('about_images').select('*').order('sort_order').order('created_at'),
      supabase.from('site_images').select('image_url').eq('key', 'about').single(),
    ]);

    const text = {};
    (textRes.data || []).forEach(r => { text[r.key] = r.value; });

    let images = imagesRes.data || [];
    // Fallback: if no about_images yet but old single "about" image exists, show it
    if (images.length === 0 && legacyHero.data?.image_url) {
      images = [{ id: 'legacy', image_url: legacyHero.data.image_url }];
    }

    const bioImages = images.filter(image => !image.section || image.section === 'bio');
    const statementImages = images.filter(image => image.section === 'statement');
    return { text, bioImages, statementImages };
  } catch {
    return { text: {}, bioImages: [], statementImages: [] };
  }
}

export default async function About() {
  const { text, bioImages, statementImages } = await getAboutData();
  const bio = text.bio || siteConfig.bio;
  const statement = text.artist_statement || '';

  return (
    <section id="about" className="bg-neutral-50 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">

        {/* Section header */}
        <div className="mb-10 text-center sm:mb-16">
          <p className="text-xs tracking-[0.35em] uppercase mb-3" style={{ color: 'var(--color-coral)' }}>
            The Artist
          </p>
          <h2
            className="text-4xl font-light text-neutral-900 sm:text-5xl"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            About
          </h2>
          <div className="w-8 h-px bg-neutral-300 mx-auto mt-6" />
        </div>

        <AboutTabs
          bio={bio}
          statement={statement}
          bioImages={bioImages}
          statementImages={statementImages}
          artistName={siteConfig.artistName}
        />
      </div>
    </section>
  );
}
