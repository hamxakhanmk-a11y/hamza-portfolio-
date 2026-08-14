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

    return { text, images };
  } catch {
    return { text: {}, images: [] };
  }
}

export default async function About() {
  const { text, images } = await getAboutData();
  const bio = text.bio || siteConfig.bio;
  const statement = text.artist_statement || '';

  return (
    <section id="about" className="py-28 bg-neutral-50">
      <div className="max-w-6xl mx-auto px-6">

        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-xs tracking-[0.35em] uppercase mb-3" style={{ color: '#3d6478' }}>
            The Artist
          </p>
          <h2
            className="text-5xl font-light text-neutral-900"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            About
          </h2>
          <div className="w-8 h-px bg-neutral-300 mx-auto mt-6" />
        </div>

        {/* Content grid */}
        <div className="grid md:grid-cols-2 gap-14 items-start">

          {/* Images */}
          <div className="flex flex-col gap-6">
            {images.length === 0 ? (
              <div className="aspect-[3/4] bg-neutral-200 flex items-end p-6">
                <p className="text-neutral-400 text-xs tracking-widest uppercase">
                  Upload photos in Admin → About
                </p>
              </div>
            ) : (
              images.map((img, i) => (
                <div
                  key={img.id}
                  className={i === 0 ? '' : 'md:ml-10'}
                >
                  <img
                    src={img.image_url}
                    alt={`${siteConfig.artistName} ${i + 1}`}
                    className="w-full h-auto block shadow-[0_6px_28px_rgba(0,0,0,0.10)]"
                  />
                </div>
              ))
            )}
          </div>

          {/* Tabs — Bio / Artist Statement */}
          <div className="md:sticky md:top-28">
            <AboutTabs bio={bio} statement={statement} />

            <a
              href="/contact"
              className="mt-10 inline-block text-xs tracking-[0.2em] uppercase border-b pb-0.5 transition-colors hover:opacity-50"
              style={{ color: '#3d6478', borderColor: '#3d6478' }}
            >
              Get in Touch
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
