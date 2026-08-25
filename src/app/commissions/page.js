export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import Navbar from '@/components/Navbar';
import ArtworkGrid from '@/components/ArtworkGrid';

async function getCommissions() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data } = await supabase
      .from('artworks')
      .select('*')
      .eq('section', 'commissions')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });
    return data || [];
  } catch { return []; }
}

export default async function CommissionsPage() {
  const artworks = await getCommissions();

  return (
    <>
      <Navbar />
      <main className="bg-white min-h-screen">
        <div className="mx-auto max-w-2xl px-4 pb-10 pt-28 text-center sm:px-6 sm:pb-16 sm:pt-36">
          <p className="text-xs tracking-[0.35em] uppercase mb-3" style={{ color: 'var(--color-coral)' }}>Made to Order</p>
          <h1 className="text-4xl font-light text-neutral-900 sm:text-5xl md:text-6xl" style={{ fontFamily: 'var(--font-cormorant)' }}>
            Commissioned Works
          </h1>
          <div className="w-8 h-px bg-neutral-300 mx-auto mt-6 mb-6" />
          <p className="text-neutral-500 text-sm leading-relaxed">
            A selection of custom pieces created for private collectors. Reach out if you&apos;d like to commission a work of your own.
          </p>
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
          <ArtworkGrid artworks={artworks} emptyMessage="Commissioned pieces coming soon" />
        </div>
      </main>
    </>
  );
}
