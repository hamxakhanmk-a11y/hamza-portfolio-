import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

function isAuthorized(req) {
  return req.headers.get('authorization') === `Bearer ${process.env.ADMIN_SECRET}`;
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { data, error } = await supabase
    .from('about_images')
    .select('*')
    .order('sort_order')
    .order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { image_url, section = 'bio' } = await req.json();
  const targetSection = section === 'statement' ? 'statement' : 'bio';
  const { data, error } = await supabaseAdmin
    .from('about_images')
    .insert({ image_url, section: targetSection, sort_order: 0 })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
