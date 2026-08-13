import { NextResponse } from 'next/server';

export async function POST(req) {
  const { password } = await req.json();
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ token: process.env.ADMIN_SECRET });
}
