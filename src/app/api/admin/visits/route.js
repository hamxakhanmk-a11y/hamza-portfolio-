import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const isAdmin = req => Boolean(process.env.ADMIN_SECRET) && req.headers.get('authorization') === `Bearer ${process.env.ADMIN_SECRET}`;
const TZ = 'Asia/Karachi';
const dayKey = iso => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ }); // 2026-11-08

// Where a visit came from, in plain words.
function sourceName(host) {
  if (!host) return 'Typed the address / saved link';
  if (/instagram/.test(host)) return 'Instagram';
  if (/facebook|fb\.com|fb\.me/.test(host)) return 'Facebook';
  if (/whatsapp|wa\.me/.test(host)) return 'WhatsApp';
  if (/google\./.test(host)) return 'Google';
  if (/bing\./.test(host)) return 'Bing';
  if (/t\.co$|twitter|x\.com/.test(host)) return 'X (Twitter)';
  if (/pinterest/.test(host)) return 'Pinterest';
  if (/linkedin|lnkd\.in/.test(host)) return 'LinkedIn';
  if (/tiktok/.test(host)) return 'TikTok';
  if (/youtube|youtu\.be/.test(host)) return 'YouTube';
  return host;
}

const top = (map, limit = 10) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name, count]) => ({ name, count }));
const bump = (map, key, by = 1) => map.set(key, (map.get(key) || 0) + by);

// Every page view since a moment (in pages of 1000, the database's limit per request).
async function viewsSince(since) {
  const rows = [];
  for (let from = 0; from < 100000; from += 1000) {
    const { data, error } = await supabaseAdmin
      .from('site_visits')
      .select('created_at,visitor,session,path,referrer,country,region,city,device,browser,os')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

// CMS Visitors tab: totals, visitors per day, places, pages, sources, devices and the latest visits.
export async function GET(req) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized. Please log out and log in again.' }, { status: 401 });
  const days = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get('days')) || 7));

  // the range starts at midnight Pakistan time, `days` days back (today counts as one)
  const today = dayKey(new Date().toISOString());
  const start = new Date(`${today}T00:00:00+05:00`);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  let rows;
  try {
    rows = await viewsSince(start);
  } catch (error) {
    const missing = /site_visits/.test(error.message || '') && /does not exist|schema cache|not find/i.test(error.message || '');
    return NextResponse.json({ error: missing ? 'NOT_SET_UP' : error.message }, { status: missing ? 503 : 500 });
  }

  // one entry per visit (session), built from its page views (oldest first)
  const visits = new Map();
  for (const row of [...rows].reverse()) {
    let visit = visits.get(row.session);
    if (!visit) {
      visit = { visitor: row.visitor, start: row.created_at, end: row.created_at, pages: [], referrer: row.referrer,
        country: row.country, region: row.region, city: row.city, device: row.device, browser: row.browser, os: row.os };
      visits.set(row.session, visit);
    }
    visit.end = row.created_at;
    if (visit.pages[visit.pages.length - 1] !== row.path) visit.pages.push(row.path);
    if (!visit.referrer && row.referrer) visit.referrer = row.referrer;
  }

  const visitors = new Set(rows.map(r => r.visitor));
  const daily = new Map();
  for (let d = new Date(start); d <= new Date(); d.setUTCDate(d.getUTCDate() + 1)) daily.set(dayKey(d.toISOString()), { visitors: new Set(), views: 0 });
  for (const row of rows) {
    const day = daily.get(dayKey(row.created_at));
    if (day) { day.visitors.add(row.visitor); day.views++; }
  }

  const countries = new Map(), cities = new Map(), pages = new Map(), sources = new Map(), devices = new Map(), browsers = new Map();
  const visitorsBy = (map, key, visitor) => { if (!map.has(key)) map.set(key, new Set()); map.get(key).add(visitor); };
  for (const visit of visits.values()) {
    visitorsBy(countries, visit.country || '??', visit.visitor);
    if (visit.city) visitorsBy(cities, `${visit.city}${visit.country ? `, ${visit.country}` : ''}`, visit.visitor);
    visitorsBy(sources, sourceName(visit.referrer), visit.visitor);
    visitorsBy(devices, visit.device || 'unknown', visit.visitor);
    visitorsBy(browsers, visit.browser || 'Other', visit.visitor);
  }
  for (const row of rows) bump(pages, row.path);
  const countSets = map => new Map([...map.entries()].map(([k, set]) => [k, set.size]));

  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  // a visitor seen before this visit started (within the chosen days) is "returning"
  const firstSeen = new Map();
  for (const row of rows) if (!firstSeen.has(row.visitor) || row.created_at < firstSeen.get(row.visitor)) firstSeen.set(row.visitor, row.created_at);
  const recent = [...visits.values()].sort((a, b) => b.end.localeCompare(a.end)).slice(0, 40).map(v => ({
    ...v, source: sourceName(v.referrer), returning: firstSeen.get(v.visitor) < v.start,
  }));

  return NextResponse.json({
    days,
    totals: {
      visitors: visitors.size,
      visits: visits.size,
      views: rows.length,
      pagesPerVisit: visits.size ? rows.length / visits.size : 0,
      liveNow: new Set(rows.filter(r => new Date(r.created_at).getTime() >= fiveMinutesAgo).map(r => r.visitor)).size,
    },
    daily: [...daily.entries()].map(([day, d]) => ({ day, visitors: d.visitors.size, views: d.views })),
    countries: top(countSets(countries), 12),
    cities: top(countSets(cities), 12),
    pages: top(pages, 12),
    sources: top(countSets(sources), 10),
    devices: top(countSets(devices), 5),
    browsers: top(countSets(browsers), 6),
    recent,
  });
}

