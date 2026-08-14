import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

function isAuthorized(req) {
  return req.headers.get('authorization') === `Bearer ${process.env.ADMIN_SECRET}`;
}

export async function GET() {
  const { data, error } = await supabase.from('site_images').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const result = {};
  (data || []).forEach(row => { result[row.key] = row.image_url; });
  return NextResponse.json(result);
}

export async function PUT(req) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { key, image_url } = await req.json();
  const { error } = await supabaseAdmin
    .from('site_images')
    .upsert({ key, image_url }, { onConflict: 'key' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
