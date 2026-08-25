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
      .eq('show_on_home', true)
      .eq('show_on_website', true)
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
            <p className="text-xs tracking-[0.35em] uppercase mb-3" style={{ color: 'var(--color-coral)' }}>
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
            style={{ color: 'var(--color-ocean)', borderColor: 'var(--color-water)' }}
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
                className="group flex h-full flex-col"
              >
                {/* Image */}
                <div className="relative w-fit max-w-full mx-auto mt-auto transition-transform duration-500 group-hover:-translate-y-1">
                  <img
                    src={artwork.image_url}
                    alt={artwork.title}
                    className="living-image max-w-full w-auto h-auto max-h-[420px] block"
                    style={{
                      mixBlendMode: 'multiply',
                      filter: artwork.image_url?.toLowerCase().includes('.png')
                        ? 'drop-shadow(0 16px 12px rgba(0,0,0,.15))'
                        : 'none',
                    }}
                  />
                  {!artwork.available && (
                    <div className="absolute top-2 left-2 bg-neutral-800/80 text-white text-[9px] tracking-[0.2em] uppercase px-2.5 py-1">
                      Sold
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="mt-3 px-0.5 min-h-6">
                  <h3 className="text-sm text-neutral-700 font-light line-clamp-1">{artwork.title}</h3>
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
            style={{ color: 'var(--color-ocean)', borderColor: 'var(--color-water)' }}
          >
            View All Works
          </Link>
        </div>
      </div>
    </section>
  );
}
