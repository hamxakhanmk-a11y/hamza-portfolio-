export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

async function getArtworks() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data } = await supabase
      .from('artworks')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });
    return data || [];
  } catch { return []; }
}

export default async function PortfolioPage() {
  const artworks = await getArtworks();

  return (
    <>
      <Navbar />
      <main className="bg-white min-h-screen">
        {/* Header */}
        <div className="pt-36 pb-16 text-center">
          <p className="text-xs tracking-[0.35em] uppercase mb-3" style={{ color: '#3d6478' }}>Collection</p>
          <h1
            className="text-6xl font-light text-neutral-900"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            Portfolio
          </h1>
          <div className="w-8 h-px bg-neutral-300 mx-auto mt-6" />
        </div>

        {/* Grid */}
        <div className="max-w-6xl mx-auto px-6 pb-28">
          {artworks.length === 0 ? (
            <p className="text-center text-neutral-300 text-sm tracking-widest uppercase py-24">
              Artworks coming soon
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
              {artworks.map(artwork => (
                <Link
                  key={artwork.id}
                  href={`/portfolio/${artwork.id}`}
                  className="group block"
                >
                  {/* Image */}
                  <div className="relative overflow-hidden shadow-[0_6px_28px_rgba(0,0,0,0.11)] group-hover:shadow-[0_10px_40px_rgba(0,0,0,0.17)] transition-shadow duration-500">
                    <div className="aspect-[4/5] bg-neutral-100">
                      <img
                        src={artwork.image_url}
                        alt={artwork.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                      />
                    </div>
                    {/* Sold badge */}
                    {!artwork.available && (
                      <div className="absolute top-0 left-0 bg-neutral-800/75 text-white text-[9px] tracking-[0.25em] uppercase px-3 py-1.5">
                        Sold
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="mt-5 px-1">
                    <h2 className="text-sm text-neutral-700 font-light leading-snug">{artwork.title}</h2>
                    {artwork.size && (
                      <p className="text-xs text-neutral-400 mt-0.5">{artwork.size}</p>
                    )}
                    {artwork.price && (
                      <p className="text-xs text-neutral-500 mt-1">{artwork.price}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
