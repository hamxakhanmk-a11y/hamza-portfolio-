import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

async function getNewestArtworks() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data } = await supabase
      .from('artworks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(4);
    return data || [];
  } catch { return []; }
}

export default async function Gallery() {
  const artworks = await getNewestArtworks();

  return (
    <section id="gallery" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">

        {/* Section header */}
        <div className="flex items-end justify-between mb-16">
          <div>
            <p className="text-xs tracking-[0.35em] uppercase mb-3" style={{ color: '#3d6478' }}>
              Latest Work
            </p>
            <h2
              className="text-4xl font-light text-neutral-900"
              style={{ fontFamily: 'var(--font-cormorant)' }}
            >
              Newest Paintings
            </h2>
          </div>
          <Link
            href="/portfolio"
            className="hidden sm:block text-xs tracking-[0.2em] uppercase border-b pb-0.5 transition-colors hover:opacity-50"
            style={{ color: '#3d6478', borderColor: '#3d6478' }}
          >
            View All Works
          </Link>
        </div>

        {artworks.length === 0 ? (
          <p className="text-center text-neutral-300 text-sm tracking-widest uppercase py-16">
            Artworks coming soon
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {artworks.map(artwork => (
              <Link
                key={artwork.id}
                href={`/portfolio/${artwork.id}`}
                className="group block"
              >
                {/* Image */}
                <div className="relative shadow-[0_4px_18px_rgba(0,0,0,0.10)] group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.16)] transition-shadow duration-500">
                  <img
                    src={artwork.image_url}
                    alt={artwork.title}
                    className="w-full h-auto block transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                  {!artwork.available && (
                    <div className="absolute top-2 left-2 bg-neutral-800/80 text-white text-[9px] tracking-[0.2em] uppercase px-2.5 py-1">
                      Sold
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="mt-3 px-0.5">
                  <h3 className="text-sm text-neutral-700 font-light">{artwork.title}</h3>
                  {artwork.price && (
                    <p className="text-xs text-neutral-400 mt-0.5">{artwork.price}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Mobile "view all" */}
        <div className="text-center mt-12 sm:hidden">
          <Link
            href="/portfolio"
            className="text-xs tracking-[0.2em] uppercase border-b pb-0.5"
            style={{ color: '#3d6478', borderColor: '#3d6478' }}
          >
            View All Works
          </Link>
        </div>
      </div>
    </section>
  );
}
