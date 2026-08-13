import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

function isAuthorized(req) {
  return req.headers.get('authorization') === `Bearer ${process.env.ADMIN_SECRET}`;
}

export async function GET() {
  const { data, error } = await supabase
    .from('artworks')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, medium, size, price, image_url, available } = await req.json();

  const { data, error } = await supabaseAdmin
    .from('artworks')
    .insert([{ title, medium, size, price, image_url, available }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
