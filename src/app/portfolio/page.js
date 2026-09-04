export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import ArtworkGrid from '@/components/ArtworkGrid';

async function getPortfolioArtworks() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data } = await supabase
      .from('artworks')
      .select('*')
      .in('section', ['portfolio', 'shop'])
      .eq('show_on_website', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });
    return data || [];
  } catch { return []; }
}

export default async function PortfolioPage() {
  const artworks = await getPortfolioArtworks();

  return (
    <>
      <main className="bg-white min-h-screen">
        <div className="pb-10 pt-28 text-center sm:pb-16 sm:pt-36">
          <p className="text-xs tracking-[0.35em] uppercase mb-3" style={{ color: 'var(--color-coral)' }}>Collection</p>
          <h1 className="text-4xl font-light text-neutral-900 sm:text-5xl md:text-6xl" style={{ fontFamily: 'var(--font-cormorant)' }}>
            Portfolio
          </h1>
          <div className="w-8 h-px bg-neutral-300 mx-auto mt-6" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
          <ArtworkGrid artworks={artworks} emptyMessage="Portfolio pieces coming soon" />
        </div>
      </main>
    </>
  );
}
