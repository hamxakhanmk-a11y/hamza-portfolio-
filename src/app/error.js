'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import Link from 'next/link';

// Shown when a page couldn't load (for example the database didn't answer in time).
export default function ErrorPage({ error, retry }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[80svh] flex-col items-center justify-center gap-6 px-6 pt-16 text-center text-[#075f8f]">
      <p className="text-xs uppercase tracking-[0.3em] text-[#27a8c7]">Something went wrong</p>
      <h1 className="font-[family-name:var(--font-cormorant)] text-4xl md:text-5xl">This page couldn&apos;t load</h1>
      <p className="max-w-md text-sm text-[#063a5b]/75">It may be a slow connection. Please try again in a moment.</p>
      <div className="flex gap-3">
        <button type="button" onClick={() => retry()} className="rounded-full bg-[#075f8f] px-6 py-2.5 text-xs uppercase tracking-[0.2em] text-[#fffaf2]">
          Try again
        </button>
        <Link href="/" className="rounded-full border border-[#075f8f]/30 px-6 py-2.5 text-xs uppercase tracking-[0.2em]">
          Home
        </Link>
      </div>
    </main>
  );
}
