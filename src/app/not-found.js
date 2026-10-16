import Link from 'next/link';

// Shown for any address that doesn't exist (and for paintings or shows that aren't there).
export default function NotFound() {
  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 pt-20 text-center text-[#075f8f]"
      style={{ background: 'linear-gradient(180deg, #edf7fb, #fffaf2 75%)' }}>
      {/* soft ripples, like a drop that landed somewhere else */}
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {[22, 36, 52].map((size, i) => (
          <span key={size} className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#27a8c7]"
            style={{ width: `${size}rem`, height: `${size}rem`, opacity: 0.18 - i * 0.05 }} />
        ))}
      </div>
      <p className="relative text-xs uppercase tracking-[0.35em] text-[#ed7189]">Page not found</p>
      <h1 className="relative mt-4 text-7xl font-light leading-none sm:text-8xl" style={{ fontFamily: 'var(--font-cormorant)' }}>404</h1>
      <p className="relative mt-5 text-2xl font-light sm:text-3xl" style={{ fontFamily: 'var(--font-cormorant)' }}>This page has drifted away</p>
      <p className="relative mt-3 max-w-sm text-sm leading-relaxed text-[#063a5b]/70">
        The link may be old, or the page may have moved. The paintings are still here.
      </p>
      <div className="relative mt-9 flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded-full bg-[#075f8f] px-6 py-2.5 text-xs uppercase tracking-[0.2em] text-[#fffaf2] transition hover:bg-[#ed7189]">
          Back to Home
        </Link>
        <Link href="/portfolio" className="rounded-full border border-[#075f8f]/30 px-6 py-2.5 text-xs uppercase tracking-[0.2em] transition hover:border-[#075f8f]">
          View Portfolio
        </Link>
      </div>
    </main>
  );
}
