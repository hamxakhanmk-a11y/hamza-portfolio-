import { createClient } from '@supabase/supabase-js';
import { siteConfig } from '@/data/config';

async function getAboutImage() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data } = await supabase.from('site_images').select('image_url').eq('key', 'about').single();
    return data?.image_url || '';
  } catch { return ''; }
}

export default async function About() {
  const aboutImage = await getAboutImage();

  return (
    <section id="about" className="py-28 bg-neutral-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">

          {/* Photo */}
          <div className="relative aspect-[3/4] bg-neutral-200 overflow-hidden">
            {aboutImage
              ? <img src={aboutImage} alt={siteConfig.artistName} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-end p-6">
                  <p className="text-neutral-400 text-xs tracking-widest uppercase">
                    Upload your photo in Admin → Site Photos
                  </p>
                </div>
            }
          </div>

          {/* Text */}
          <div className="flex flex-col gap-6">
            <p className="text-xs tracking-[0.35em] uppercase" style={{ color: '#3d6478' }}>The Artist</p>
            <h2 className="text-5xl font-light text-neutral-900 leading-tight" style={{ fontFamily: 'var(--font-cormorant)' }}>
              About
            </h2>
            <div className="w-8 h-px bg-neutral-300" />
            <p className="text-neutral-600 leading-relaxed">{siteConfig.bio}</p>
            <a
              href="#contact"
              className="self-start text-xs tracking-[0.2em] uppercase border-b pb-0.5 transition-colors hover:opacity-50"
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
