'use client';

import { useCallback, useEffect, useState } from 'react';

// CMS "Visitors" tab: how many people visited, from where, which pages, and the latest visits.
const RANGES = [[1, 'Today'], [7, '7 days'], [30, '30 days'], [90, '90 days'], [365, '1 year']];
const INK = '#1f2a27';
const BAR = '#2d7d6b';

const SETUP_SQL = `create table if not exists public.site_visits (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  visitor text not null,
  session text not null,
  path text not null,
  referrer text,
  country text,
  region text,
  city text,
  device text,
  browser text,
  os text
);
create index if not exists site_visits_created_at_idx on public.site_visits (created_at desc);
alter table public.site_visits enable row level security;`;

let regionNames = null;
function countryName(code) {
  if (!code || code === '??') return 'Unknown place';
  try {
    regionNames ||= new Intl.DisplayNames(['en'], { type: 'region' });
    return regionNames.of(code) || code;
  } catch { return code; }
}
const flag = code => (code && /^[A-Z]{2}$/.test(code)
  ? String.fromCodePoint(...[...code].map(c => 127397 + c.charCodeAt(0))) : '🌐');

const pageName = path => ({ '/': 'Home', '/portfolio': 'Portfolio', '/commissions': 'Commissions', '/shows': 'Shows', '/about': 'About', '/contact': 'Contact' }[path]
  || path.replace(/^\//, '').replace(/[-/]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
const deviceName = d => ({ phone: 'Phone', tablet: 'Tablet', computer: 'Computer' }[d] || 'Unknown');

function timeAgo(iso) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Karachi' });
}
const shortDay = day => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function Tile({ label, value, note }) {
  return (
    <div className="border border-neutral-200 bg-white p-4 sm:p-5">
      <span className="block text-3xl font-light text-neutral-900" style={{ fontFamily: 'var(--font-cormorant)' }}>{value}</span>
      <span className="mt-1 block text-[10px] uppercase tracking-[0.18em] text-neutral-500">{label}</span>
      {note && <span className="mt-1 block text-[11px] text-neutral-400">{note}</span>}
    </div>
  );
}

// Visitors per day: one bar per day, hover/tap a bar for its numbers.
function DailyChart({ daily }) {
  const [active, setActive] = useState(null);
  const max = Math.max(1, ...daily.map(d => d.visitors));
  const niceMax = max <= 4 ? max : Math.ceil(max / 4) * 4;
  const W = 640, H = 200, left = 34, bottom = 22, top = 10;
  const plotW = W - left - 6, plotH = H - top - bottom;
  const slot = plotW / daily.length;
  const barW = Math.max(2, Math.min(28, slot - 2)); // 2px gap between bars
  const y = v => top + plotH - (v / niceMax) * plotH;
  const ticks = [0, niceMax / 2, niceMax].filter((v, i, a) => a.indexOf(v) === i);
  const labelEvery = Math.ceil(daily.length / 8);
  const shown = active == null ? null : daily[active];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Visitors per day" onMouseLeave={() => setActive(null)}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={left} x2={W - 6} y1={y(t)} y2={y(t)} stroke="#e7e5e4" strokeWidth="1" />
            <text x={left - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="#78716c">{Number.isInteger(t) ? t : t.toFixed(1)}</text>
          </g>
        ))}
        {daily.map((d, i) => {
          const x = left + i * slot + (slot - barW) / 2;
          const h = Math.max(d.visitors ? 2 : 0, top + plotH - y(d.visitors));
          const r = Math.min(4, barW / 2, h);
          return (
            <g key={d.day}>
              {/* rounded top, square bottom on the baseline */}
              {h > 0 && (
                <path d={`M${x},${top + plotH} V${top + plotH - h + r} Q${x},${top + plotH - h} ${x + r},${top + plotH - h} H${x + barW - r} Q${x + barW},${top + plotH - h} ${x + barW},${top + plotH - h + r} V${top + plotH} Z`}
                  fill={BAR} opacity={active == null || active === i ? 1 : 0.45} />
              )}
              {/* a wider invisible target than the bar itself */}
              <rect x={left + i * slot} y={top} width={slot} height={plotH} fill="transparent"
                onMouseEnter={() => setActive(i)} onClick={() => setActive(i)} />
              {((i % labelEvery === 0 && daily.length - 1 - i >= labelEvery / 2) || i === daily.length - 1) && (
                <text x={left + i * slot + slot / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#78716c">{shortDay(d.day)}</text>
              )}
            </g>
          );
        })}
      </svg>
      {shown && (
        <div className="pointer-events-none absolute top-0 border border-neutral-200 bg-white px-3 py-2 text-xs shadow-md"
          style={{ left: `${Math.min(80, Math.max(0, ((left + active * slot + slot / 2) / W) * 100 - 10))}%` }}>
          <p className="font-medium" style={{ color: INK }}>{shortDay(shown.day)}</p>
          <p className="text-neutral-600">{shown.visitors} {shown.visitors === 1 ? 'visitor' : 'visitors'} · {shown.views} page {shown.views === 1 ? 'view' : 'views'}</p>
        </div>
      )}
      <table className="sr-only">
        <caption>Visitors per day</caption>
        <thead><tr><th>Day</th><th>Visitors</th><th>Page views</th></tr></thead>
        <tbody>{daily.map(d => <tr key={d.day}><td>{d.day}</td><td>{d.visitors}</td><td>{d.views}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

// A ranked list with thin bars (countries, pages, ...).
function RankList({ title, items, label = x => x, unit = 'visitors', empty = 'Nothing yet' }) {
  const max = Math.max(1, ...items.map(i => i.count));
  return (
    <section className="border border-neutral-200 bg-white p-4 sm:p-5">
      <h3 className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">{title}</h3>
      {items.length === 0 ? <p className="text-sm text-neutral-400">{empty}</p> : (
        <ul className="flex flex-col gap-3">
          {items.map(item => (
            <li key={item.name} title={`${item.count} ${unit}`}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate" style={{ color: INK }}>{label(item.name)}</span>
                <span className="shrink-0 tabular-nums text-neutral-600">{item.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-neutral-100">
                <div className="h-1.5 rounded-full" style={{ width: `${(item.count / max) * 100}%`, background: BAR }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function VisitorsDashboard({ token }) {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async range => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/visits?days=${range}`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || 'Could not load the visitor numbers.');
      setData(json);
      setError('');
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => { void load(days); });
    return () => window.cancelAnimationFrame(frame);
  }, [days, load]);

  const header = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 text-xs uppercase tracking-[0.25em] text-neutral-400">Website Statistics</p>
        <h2 className="text-4xl font-light" style={{ fontFamily: 'var(--font-cormorant)' }}>Visitors</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-500">
          Who visited your website: how many people, from which places, what they looked at and how they found you.
          Visitors stay anonymous (no names or addresses are collected). Your own visits don’t count on devices where you’re logged in here.
        </p>
      </div>
      <button type="button" onClick={() => load(days)} disabled={loading}
        className="self-start border border-neutral-300 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-neutral-700 hover:border-neutral-800 disabled:opacity-40 sm:self-auto">
        {loading ? 'Loading…' : 'Refresh'}
      </button>
    </div>
  );

  if (error === 'NOT_SET_UP') {
    return (
      <div className="flex flex-col gap-7">
        {header}
        <section className="border border-amber-300 bg-amber-50/60 p-5 sm:p-7">
          <h3 className="text-lg font-medium text-neutral-900">One-time setup needed</h3>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-neutral-700">
            <li>Open your project on <strong>supabase.com</strong> and click <strong>SQL Editor</strong> in the left menu.</li>
            <li>Click <strong>New query</strong>, paste the text below, and press <strong>Run</strong>.</li>
            <li>Come back here and press <strong>Refresh</strong>. Visits are counted from then on.</li>
          </ol>
          <pre className="mt-4 max-h-64 overflow-auto whitespace-pre bg-white p-4 text-[11px] leading-relaxed text-neutral-700">{SETUP_SQL}</pre>
          <button type="button" onClick={() => { navigator.clipboard?.writeText(SETUP_SQL); setCopied(true); }}
            className="mt-3 bg-neutral-900 px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] text-white">
            {copied ? '✓ Copied' : 'Copy the text'}
          </button>
        </section>
      </div>
    );
  }

  const t = data?.totals;
  return (
    <div className="flex flex-col gap-7">
      {header}

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Time range">
        {RANGES.map(([value, label]) => (
          <button key={value} type="button" onClick={() => setDays(value)} aria-pressed={days === value}
            className={`px-4 py-2 text-[11px] uppercase tracking-[0.14em] ${days === value ? 'bg-neutral-900 text-white' : 'border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-600'}`}>
            {label}
          </button>
        ))}
        {t?.liveNow > 0 && (
          <span className="ml-auto inline-flex items-center gap-2 text-xs text-neutral-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#2d7d6b]" aria-hidden="true" />
            {t.liveNow} on the site right now
          </span>
        )}
      </div>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {!data ? (
        <p className="py-16 text-center text-sm text-neutral-400">Loading visitor numbers…</p>
      ) : (
        <div className={`flex flex-col gap-7 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            <Tile label="People" value={t.visitors} note="different visitors" />
            <Tile label="Visits" value={t.visits} note="times the site was opened" />
            <Tile label="Page views" value={t.views} />
            <Tile label="Pages per visit" value={t.pagesPerVisit ? t.pagesPerVisit.toFixed(1) : '0'} />
          </div>

          {data.daily.length > 1 && (
            <section className="border border-neutral-200 bg-white p-4 sm:p-5">
              <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">People per day</h3>
              <DailyChart daily={data.daily} />
            </section>
          )}

          <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
            <RankList title="Countries" items={data.countries} label={code => `${flag(code)}  ${countryName(code)}`} />
            <RankList title="Cities" items={data.cities} label={name => {
              const [city, code] = name.split(', ');
              return code ? `${city}, ${countryName(code)}` : city;
            }} />
            <RankList title="How they found you" items={data.sources} />
            <RankList title="Pages viewed" items={data.pages} label={pageName} unit="views" />
            <RankList title="Devices" items={data.devices} label={deviceName} />
            <RankList title="Browsers & apps" items={data.browsers} />
          </div>

          <section className="border border-neutral-200 bg-white">
            <h3 className="border-b border-neutral-100 p-4 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500 sm:p-5">Latest visits</h3>
            {data.recent.length === 0 ? <p className="p-5 text-sm text-neutral-400">No visits in this time yet.</p> : (
              <ul className="divide-y divide-neutral-100">
                {data.recent.map((v, i) => (
                  <li key={`${v.start}-${i}`} className="flex flex-col gap-1.5 p-4 sm:px-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <span className="text-sm" style={{ color: INK }}>
                        {flag(v.country)}{' '}
                        <strong className="font-medium">{[v.city, v.region && v.region.length > 3 && v.region !== v.city ? v.region : null, countryName(v.country)].filter(Boolean).join(', ')}</strong>
                        {v.returning && <span className="ml-2 bg-[#2d7d6b]/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[#1f4d43]">came back</span>}
                      </span>
                      <span className="text-xs text-neutral-500">{timeAgo(v.end)}</span>
                    </div>
                    <p className="text-xs text-neutral-500">
                      {deviceName(v.device)}{v.os && v.os !== 'Other' ? ` · ${v.os}` : ''}{v.browser && v.browser !== 'Other' ? ` · ${v.browser}` : ''} · from {v.source}
                    </p>
                    <p className="text-xs text-neutral-600">{v.pages.map(pageName).join('  →  ')}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
