import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function isAuthorized(req) {
  return req.headers.get('authorization') === `Bearer ${process.env.ADMIN_SECRET}`;
}

export async function POST(req) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  const bucket = formData.get('bucket') || 'artworks';
  if (!file || typeof file.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'No image was received.' }, { status: 400 });
  }
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const supportedTypes = {
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/jpeg': 'jpg',
  };
  const contentType = supportedTypes[file.type] ? file.type : 'image/jpeg';
  const extension = supportedTypes[contentType] || 'jpg';
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(fileName, buffer, { contentType, upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(fileName);
  return NextResponse.json({ url: data.publicUrl });
}
