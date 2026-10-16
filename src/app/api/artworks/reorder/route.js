import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function isAuthorized(req) {
  // fail closed: a missing secret must never let "Bearer undefined" through
  const secret = process.env.ADMIN_SECRET;
  return Boolean(secret) && req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function PUT(req) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { items } = await req.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'No artwork order was provided.' }, { status: 400 });
  }

  const updates = await Promise.all(
    items.map((item, index) =>
      supabaseAdmin
        .from('artworks')
        .update({ display_order: index })
        .eq('id', item.id)
    )
  );

  const failed = updates.find(result => result.error);
  if (failed) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
