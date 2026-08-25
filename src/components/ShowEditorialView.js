import Link from 'next/link';

export default function ShowEditorialView({ show, images }) {
  const projectNumber = String(show.display_order || show.id || 1).padStart(2, '0');

  return (
    <main className="min-h-screen bg-white pb-12 pt-24 sm:pb-20 sm:pt-28">
      <article className="mx-auto max-w-[1320px] bg-white">
        <header className="grid gap-8 border-b border-neutral-200 px-5 py-8 sm:px-10 sm:py-12 md:grid-cols-[150px_1fr_280px] md:items-end lg:px-16">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-400">Exhibition</p>
            <span className="mt-2 block text-7xl font-light leading-none text-[#075f8f]/35 sm:text-8xl" style={{ fontFamily: 'var(--font-cormorant)' }}>.{projectNumber}</span>
          </div>
          <div>
            <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-[#ed7189]">Selected Show</p>
            <h1 className="max-w-3xl text-4xl font-light leading-[.95] text-[#063a5b] sm:text-6xl lg:text-7xl" style={{ fontFamily: 'var(--font-cormorant)' }}>{show.title}</h1>
          </div>
          <dl className="grid grid-cols-[70px_1fr] gap-x-3 gap-y-2 text-[10px] leading-4 text-neutral-600">
            {show.date && <><dt className="uppercase tracking-wider text-neutral-400">Date</dt><dd>{show.date}</dd></>}
            {show.location && <><dt className="uppercase tracking-wider text-neutral-400">Location</dt><dd>{show.location}</dd></>}
          </dl>
        </header>

        <div className="px-5 py-8 sm:px-10 sm:py-12 lg:px-16 lg:py-16">
          <div className="mb-8 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-neutral-400">
            <Link href="/shows" className="transition hover:text-[#075f8f]">← Shows</Link>
            <span>Exhibition View</span>
          </div>

          {show.cover_image && (
            <figure className="editorial-art-frame mx-auto max-w-5xl">
              <img src={show.cover_image} alt={show.title} className="artwork-inside-motion h-auto w-auto object-contain" />
            </figure>
          )}

          {show.description && (
            <div className="mx-auto grid max-w-5xl gap-8 py-14 md:grid-cols-[.7fr_1.3fr] md:py-20">
              <div className="flex items-start gap-4">
                <span className="mt-2 h-px w-12 bg-[#ed7189]" />
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#075f8f]">About the Show</p>
              </div>
              <p className="whitespace-pre-line text-base leading-8 text-neutral-600 sm:text-lg">{show.description}</p>
            </div>
          )}

          {images.length > 0 && (
            <section className="flex flex-col gap-16 border-t border-neutral-200 pt-14 sm:gap-24 sm:pt-20">
              {images.map((image, index) => {
                const alignRight = index % 2 === 0;
                return (
                  <figure key={image.id || index} className={`w-full md:w-[76%] ${alignRight ? 'md:self-end' : 'md:self-start'}`}>
                    <div className={`mb-4 flex items-end gap-4 ${alignRight ? 'justify-end text-right' : ''}`}>
                      <span className="text-5xl font-light leading-none text-[#075f8f]/25" style={{ fontFamily: 'var(--font-cormorant)' }}>{String(index + 2).padStart(2, '0')}</span>
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.24em] text-[#ed7189]">Show View</p>
                        {image.caption && <figcaption className="mt-1 text-xs italic text-neutral-500">{image.caption}</figcaption>}
                      </div>
                    </div>
                    <div className="editorial-art-frame">
                      <img src={image.image_url} alt={image.caption || `${show.title} view ${index + 2}`} className="artwork-inside-motion h-auto w-auto object-contain" />
                    </div>
                  </figure>
                );
              })}
            </section>
          )}

          <footer className="mt-16 border-t border-neutral-200 pt-10 text-right sm:mt-24">
            <Link href="/shows" className="text-[10px] uppercase tracking-[0.2em] text-[#075f8f] transition hover:text-[#ed7189]">Explore all shows →</Link>
          </footer>
        </div>
      </article>
    </main>
  );
}
