import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function isAuthorized(req) {
  return req.headers.get('authorization') === `Bearer ${process.env.ADMIN_SECRET}`;
}

export async function POST(req) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { filename, bucket = 'artworks' } = await req.json();
  const ext = (filename.split('.').pop() || 'jpg').toLowerCase();
  const path = `${Date.now()}.${ext}`;

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;

  return NextResponse.json({ signedUrl: data.signedUrl, path, publicUrl });
}
