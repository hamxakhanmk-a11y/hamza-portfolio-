'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Counts page views for the CMS "Visitors" tab. Anonymous: a random id stays in this browser so a returning
// visitor is counted once, and another id marks one visit (this tab). Your own browsing doesn't count once
// you've logged in to the CMS on that device.
function randomId() {
  try { return crypto.randomUUID(); } catch { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`; }
}

function storedId(storage, key) {
  try {
    let id = storage.getItem(key);
    if (!id) { id = randomId(); storage.setItem(key, id); }
    return id;
  } catch {
    return randomId();
  }
}

export default function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    try { if (localStorage.getItem('admin_token')) return; } catch {}
    if (navigator.webdriver) return; // automated test browsers

    const visitor = storedId(localStorage, 'hs_visitor');
    const session = storedId(sessionStorage, 'hs_visit');
    let referrer = '';
    try {
      // where they came from only matters on the first page of a visit
      if (!sessionStorage.getItem('hs_visit_started')) {
        referrer = document.referrer || '';
        sessionStorage.setItem('hs_visit_started', '1');
      }
    } catch {}

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname, visitor, session, referrer }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
