import { NextResponse, after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|headless|lighthouse|pingdom|monitor|curl|wget|python|axios|node-fetch/i;
const ID = /^[a-z0-9-]{8,64}$/i;

function readDevice(ua) {
  const device = /ipad|tablet|(android(?!.*mobile))|kindle|silk/i.test(ua) ? 'tablet'
    : /mobi|iphone|ipod|android|phone/i.test(ua) ? 'phone' : 'computer';
  const browser = /edg\//i.test(ua) ? 'Edge'
    : /opr\/|opera/i.test(ua) ? 'Opera'
    : /samsungbrowser/i.test(ua) ? 'Samsung Internet'
    : /fban|fbav|instagram/i.test(ua) ? (/instagram/i.test(ua) ? 'Instagram app' : 'Facebook app')
    : /crios|chrome/i.test(ua) ? 'Chrome'
    : /fxios|firefox/i.test(ua) ? 'Firefox'
    : /safari/i.test(ua) ? 'Safari' : 'Other';
  const os = /iphone|ipad|ipod/i.test(ua) ? 'iOS'
    : /android/i.test(ua) ? 'Android'
    : /windows/i.test(ua) ? 'Windows'
    : /mac os x|macintosh/i.test(ua) ? 'macOS'
    : /linux/i.test(ua) ? 'Linux' : 'Other';
  return { device, browser, os };
}

const decode = value => {
  if (!value) return null;
  try { return decodeURIComponent(value).slice(0, 80); } catch { return value.slice(0, 80); }
};

// Records one page view. Called by the site's VisitTracker; answers straight away and saves afterwards.
export async function POST(req) {
  const ua = req.headers.get('user-agent') || '';
  if (!ua || BOT.test(ua)) return new NextResponse(null, { status: 204 });

  let body;
  try { body = await req.json(); } catch { return new NextResponse(null, { status: 204 }); }
  const path = String(body?.path || '');
  if (!path.startsWith('/') || path.startsWith('/admin') || path.startsWith('/api') || !ID.test(body?.visitor || '') || !ID.test(body?.session || '')) {
    return new NextResponse(null, { status: 204 });
  }

  let referrer = null;
  try {
    const host = new URL(String(body.referrer || '')).hostname.replace(/^www\./, '');
    const own = (req.headers.get('host') || '').replace(/^www\./, '').split(':')[0];
    if (host && host !== own) referrer = host.slice(0, 80);
  } catch {}

  // Location comes from Vercel (worked out from the connection; the address itself is never stored).
  const row = {
    visitor: body.visitor,
    session: body.session,
    path: path.split('?')[0].slice(0, 200),
    referrer,
    country: (req.headers.get('x-vercel-ip-country') || '').slice(0, 2) || null,
    region: decode(req.headers.get('x-vercel-ip-country-region')),
    city: decode(req.headers.get('x-vercel-ip-city')),
    ...readDevice(ua),
  };

  after(async () => {
    await supabaseAdmin.from('site_visits').insert(row);
  });
  return new NextResponse(null, { status: 204 });
}
