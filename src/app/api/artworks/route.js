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

  const { title, medium, size, price, image_url, available, description, section } = await req.json();

  const targetSection = section || 'portfolio';
  const sectionQuery = targetSection === 'portfolio'
    ? supabaseAdmin.from('artworks').select('display_order').in('section', ['portfolio', 'shop']).order('display_order', { ascending: false }).limit(1)
    : supabaseAdmin.from('artworks').select('display_order').eq('section', targetSection).order('display_order', { ascending: false }).limit(1);
  const { data: lastArtwork } = await sectionQuery;
  const nextOrder = Number(lastArtwork?.[0]?.display_order ?? -1) + 1;

  const { data, error } = await supabaseAdmin
    .from('artworks')
    .insert([{ title, medium, size, price, image_url, available, description, section: targetSection, display_order: nextOrder }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
