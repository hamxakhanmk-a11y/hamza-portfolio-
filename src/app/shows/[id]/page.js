export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

async function getShow(id) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data } = await supabase.from('shows').select('*').eq('id', id).single();
    return data || null;
  } catch { return null; }
}

async function getShowImages(id) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data } = await supabase
      .from('show_images')
      .select('*')
      .eq('show_id', id)
      .order('sort_order')
      .order('created_at');
    return data || [];
  } catch { return []; }
}

export default async function ShowDetailPage(props) {
  const { id } = await props.params;
  const [show, images] = await Promise.all([getShow(id), getShowImages(id)]);

  if (!show) notFound();

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white pb-20 pt-24 sm:pb-24 sm:pt-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">

          {/* Breadcrumb */}
          <nav className="mb-8 flex items-center gap-2 text-xs text-neutral-400 sm:mb-14">
            <Link href="/shows" className="hover:text-neutral-700 transition-colors tracking-wider uppercase">
              Shows
            </Link>
            <span>/</span>
            <span className="text-neutral-600 truncate max-w-xs">{show.title}</span>
          </nav>

          {/* Header */}
          <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
            <h1
              className="text-3xl font-light leading-tight text-neutral-900 sm:text-4xl md:text-5xl"
              style={{ fontFamily: 'var(--font-cormorant)' }}
            >
              {show.title}
            </h1>
            <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs uppercase tracking-[0.16em] text-neutral-500 sm:tracking-[0.2em]">
              {show.date && <span>{show.date}</span>}
              {show.date && show.location && <span>·</span>}
              {show.location && <span>{show.location}</span>}
            </div>
            {show.description && (
              <>
                <div className="w-8 h-px bg-neutral-300 mx-auto mt-8 mb-8" />
                <p className="text-neutral-600 leading-relaxed whitespace-pre-line text-left sm:text-center">
                  {show.description}
                </p>
              </>
            )}
          </div>

          {/* Cover image */}
          {show.cover_image && (
            <div className="mb-8 flex justify-center bg-neutral-50 sm:mb-12">
              <img src={show.cover_image} alt={show.title} className="w-auto max-w-full h-auto max-h-[760px] object-contain block" />
            </div>
          )}

          {/* Gallery */}
          {images.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
              {images.map(img => (
                <figure key={img.id} className="flex flex-col gap-2">
                  <div className="flex justify-center bg-neutral-50">
                    <img src={img.image_url} alt={img.caption || show.title} className="w-auto max-w-full h-auto max-h-[620px] object-contain block" />
                  </div>
                  {img.caption && (
                    <figcaption className="text-xs text-neutral-500 italic tracking-wider">
                      {img.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}

          <div className="mt-16 text-center">
            <Link
              href="/shows"
              className="text-xs tracking-[0.2em] uppercase border-b pb-0.5 transition-colors hover:opacity-50"
              style={{ color: '#3d6478', borderColor: '#3d6478' }}
            >
              ← Back to Shows
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
