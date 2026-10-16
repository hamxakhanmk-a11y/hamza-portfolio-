import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function isAuthorized(req) {
  // fail closed: a missing secret must never let "Bearer undefined" through
  const secret = process.env.ADMIN_SECRET;
  return Boolean(secret) && req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function PATCH(req, props) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { imageId } = await props.params;
  const { image_url } = await req.json();
  const { data, error } = await supabaseAdmin
    .from('artwork_images')
    .update({ image_url })
    .eq('id', imageId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req, props) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { imageId } = await props.params;
  const { error } = await supabaseAdmin
    .from('artwork_images')
    .delete()
    .eq('id', imageId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
