export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import ArtworkEditorialView from '@/components/ArtworkEditorialView';
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
      .eq('show_on_website', true)
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

  const whatsappNumber = String(whatsapp || '').replace(/\D/g, '');

  return (
    <>
      <ArtworkEditorialView artwork={artwork} images={allImages} whatsappNumber={whatsappNumber} />
    </>
  );
}
