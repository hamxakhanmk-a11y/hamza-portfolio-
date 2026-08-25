export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ShowEditorialView from '@/components/ShowEditorialView';

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
      <ShowEditorialView show={show} images={images} />
    </>
  );
}
