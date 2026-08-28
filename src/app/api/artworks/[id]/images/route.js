import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

function isAuthorized(req) {
  return req.headers.get('authorization') === `Bearer ${process.env.ADMIN_SECRET}`;
}

export async function GET(req, props) {
  const { id } = await props.params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { data, error } = await supabase
    .from('artwork_images')
    .select('*')
    .eq('artwork_id', id)
    .order('sort_order')
    .order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req, props) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  const { image_url } = await req.json();
  const { data, error } = await supabaseAdmin
    .from('artwork_images')
    .insert({ artwork_id: id, image_url, sort_order: 0 })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req, props) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  const { image_ids } = await req.json();
  if (!Array.isArray(image_ids) || image_ids.length === 0) {
    return NextResponse.json({ error: 'No photo order was received.' }, { status: 400 });
  }

  const results = await Promise.all(image_ids.map((imageId, index) => (
    supabaseAdmin
      .from('artwork_images')
      .update({ sort_order: index })
      .eq('id', imageId)
      .eq('artwork_id', id)
  )));
  const failed = results.find(result => result.error);
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
