export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

async function getShows() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data } = await supabase
      .from('shows')
      .select('*')
      .order('display_order')
      .order('created_at', { ascending: false });
    return data || [];
  } catch { return []; }
}

export default async function ShowsPage() {
  const shows = await getShows();

  return (
    <>
      <Navbar />
      <main className="bg-white min-h-screen">
        <div className="mx-auto max-w-2xl px-4 pb-10 pt-28 text-center sm:px-6 sm:pb-16 sm:pt-36">
          <p className="text-xs tracking-[0.35em] uppercase mb-3" style={{ color: 'var(--color-coral)' }}>Exhibitions</p>
          <h1 className="text-4xl font-light text-neutral-900 sm:text-5xl md:text-6xl" style={{ fontFamily: 'var(--font-cormorant)' }}>
            Shows
          </h1>
          <div className="w-8 h-px bg-neutral-300 mx-auto mt-6 mb-6" />
          <p className="text-neutral-500 text-sm leading-relaxed">
            Exhibitions, group shows, and events where my work has been displayed.
          </p>
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
          {shows.length === 0 ? (
            <p className="text-center text-neutral-300 text-sm tracking-widest uppercase py-24">
              Shows coming soon
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
              {shows.map(show => (
                <Link key={show.id} href={`/shows/${show.id}`} className="group block">
                  <div className="relative overflow-hidden aspect-[4/3] bg-neutral-100">
                    {show.cover_image ? (
                      <img
                        src={show.cover_image}
                        alt={show.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-300 text-xs tracking-widest uppercase">
                        No cover photo
                      </div>
                    )}
                  </div>

                  <div className="mt-5 px-1">
                    <h2 className="text-lg font-light text-neutral-900" style={{ fontFamily: 'var(--font-cormorant)' }}>
                      {show.title}
                    </h2>
                    <div className="flex gap-3 mt-1.5 text-xs text-neutral-400 tracking-wider">
                      {show.date && <span>{show.date}</span>}
                      {show.date && show.location && <span>·</span>}
                      {show.location && <span>{show.location}</span>}
                    </div>
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
