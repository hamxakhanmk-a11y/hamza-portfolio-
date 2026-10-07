'use client';

import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function PageScrollReset() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (pathname.startsWith('/admin') || window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
