export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ArtworkGallery from '@/components/ArtworkGallery';
import { siteConfig } from '@/data/config';

async function getArtwork(id) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data } = await supabase
      .from('artworks')
      .select('*')
      .eq('id', id)
      .single();
    return data || null;
  } catch { return null; }
}

async function getExtraImages(id) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data } = await supabase
      .from('artwork_images')
      .select('*')
      .eq('artwork_id', id)
      .order('sort_order')
      .order('created_at');
    return data || [];
  } catch { return []; }
}

async function getWhatsapp() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data } = await supabase
      .from('site_text')
      .select('value')
      .eq('key', 'contact_whatsapp')
      .single();
    return data?.value || siteConfig.whatsapp;
  } catch { return siteConfig.whatsapp; }
}

export default async function ArtworkDetailPage(props) {
  const { id } = await props.params;
  const [artwork, extraImages, whatsapp] = await Promise.all([getArtwork(id), getExtraImages(id), getWhatsapp()]);

  if (!artwork) notFound();

  // Cover image first, then extra images
  const allImages = [
    { image_url: artwork.image_url },
    ...extraImages,
  ];

  const whatsappMsg = encodeURIComponent(
    `Hi! I'm interested in "${artwork.title}"${artwork.price ? ` (${artwork.price})` : ''}. Is it available?`
  );
  const whatsappNumber = String(whatsapp || '').replace(/\D/g, '');

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white pb-20 pt-24 sm:pb-24 sm:pt-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">

          {/* Breadcrumb */}
          <nav className="mb-8 flex items-center gap-2 text-xs text-neutral-400 sm:mb-14">
            <Link href="/portfolio" className="hover:text-neutral-700 transition-colors tracking-wider uppercase">
              Portfolio
            </Link>
            <span>/</span>
            <span className="text-neutral-600 truncate max-w-xs">{artwork.title}</span>
          </nav>

          {/* Main content */}
          <div className="grid items-start gap-9 lg:grid-cols-2 lg:gap-16">

            {/* Left — image gallery */}
            <ArtworkGallery images={allImages} title={artwork.title} />

            {/* Right — info */}
            <div className="flex flex-col gap-5 lg:sticky lg:top-28 lg:gap-6">

              {/* Status badge */}
              {!artwork.available && (
                <span className="self-start text-[9px] tracking-[0.25em] uppercase px-3 py-1.5 border border-neutral-300 text-neutral-500">
                  Sold
                </span>
              )}

              {/* Title */}
              <h1
                className="text-3xl font-light leading-tight text-neutral-900 sm:text-4xl md:text-5xl"
                style={{ fontFamily: 'var(--font-cormorant)' }}
              >
                {artwork.title}
              </h1>

              {/* Price */}
              {artwork.price && (
                <p className="text-lg text-neutral-600">{artwork.price}</p>
              )}

              <div className="w-8 h-px bg-neutral-200" />

              {/* Details */}
              <div className="flex flex-col gap-4">
                {artwork.medium && (
                  <div>
                    <p className="text-[10px] tracking-[0.25em] uppercase text-neutral-400 mb-1">Medium</p>
                    <p className="text-sm text-neutral-600">{artwork.medium}</p>
                  </div>
                )}
                {artwork.size && (
                  <div>
                    <p className="text-[10px] tracking-[0.25em] uppercase text-neutral-400 mb-1">Size</p>
                    <p className="text-sm text-neutral-600">{artwork.size}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {artwork.description && (
                <p className="text-neutral-600 leading-relaxed text-sm border-t border-neutral-100 pt-5">
                  {artwork.description}
                </p>
              )}

              {/* WhatsApp CTA */}
              {artwork.available ? (
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex w-full items-center justify-center gap-3 bg-neutral-900 px-5 py-4 text-center text-xs uppercase tracking-[0.16em] text-white transition-colors hover:bg-neutral-700 sm:w-auto sm:self-start sm:px-8 sm:tracking-[0.2em]"
                >
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Inquire to Purchase
                </a>
              ) : (
                <p className="text-xs tracking-wider text-neutral-400 uppercase mt-2">
                  This piece has found its home — commissions are available.
                </p>
              )}

              {/* Back link */}
              <Link
                href="/portfolio"
                className="mt-4 self-start text-xs tracking-[0.2em] uppercase border-b pb-0.5 transition-colors hover:opacity-50"
                style={{ color: '#3d6478', borderColor: '#3d6478' }}
              >
                ← Back to Portfolio
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
