import Link from 'next/link';
import Image from 'next/image';
import { isRoundArtwork } from '@/data/artworkPresentation';

export default function ArtworkEditorialView({ artwork, images, whatsappNumber }) {
  const cover = images[0];
  const secondary = images.slice(1);
  const projectNumber = String(artwork.display_order || artwork.id || 1).padStart(2, '0');
  const isCommission = artwork.section === 'commissions';
  const roundArtwork = isRoundArtwork(artwork);
  const backHref = isCommission ? '/commissions' : '/portfolio';
  const backLabel = isCommission ? 'Commissions' : 'Portfolio';
  const whatsappMsg = encodeURIComponent(
    `Hi! I'm interested in "${artwork.title}"${artwork.price ? ` (${artwork.price})` : ''}. Is it available?`,
  );

  return (
    <main className="min-h-screen bg-white pb-12 pt-24 sm:pb-20 sm:pt-28">
      <article className="mx-auto max-w-[1320px] bg-white">
        <header className="grid gap-8 border-b border-neutral-200 px-5 py-8 sm:px-10 sm:py-12 md:grid-cols-[150px_1fr_260px] md:items-end lg:px-16">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-400">Project</p>
            <span className="mt-2 block text-7xl font-light leading-none text-[#075f8f]/35 sm:text-8xl" style={{ fontFamily: 'var(--font-cormorant)' }}>
              .{projectNumber}
            </span>
          </div>

          <div>
            <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-[#ed7189]">Original Artwork</p>
            <h1 className="max-w-3xl text-4xl font-light leading-[.95] text-[#063a5b] sm:text-6xl lg:text-7xl" style={{ fontFamily: 'var(--font-cormorant)' }}>
              {artwork.title}
            </h1>
          </div>

          <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-2 text-[10px] leading-4 text-neutral-600">
            {artwork.medium && <><dt className="uppercase tracking-wider text-neutral-400">Medium</dt><dd>{artwork.medium}</dd></>}
            {artwork.size && <><dt className="uppercase tracking-wider text-neutral-400">Size</dt><dd>{artwork.size}</dd></>}
            {artwork.price && <><dt className="uppercase tracking-wider text-neutral-400">Price</dt><dd>{artwork.price}</dd></>}
            <dt className="uppercase tracking-wider text-neutral-400">Status</dt>
            <dd>{artwork.available ? 'Available' : 'Sold'}</dd>
          </dl>
        </header>

        <div className="px-5 py-8 sm:px-10 sm:py-12 lg:px-16 lg:py-16">
          <div className="mb-8 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-neutral-400">
            <Link href={backHref} className="transition hover:text-[#075f8f]">← {backLabel}</Link>
            <span>Featured View</span>
          </div>

          {cover && (
            <figure className="editorial-art-frame mx-auto max-w-5xl">
              <div className={`relative ${roundArtwork ? 'aspect-square h-[90%] max-h-[90%] max-w-[90%]' : 'h-full w-full'}`}>
                <Image
                  src={cover.image_url}
                  alt={artwork.title}
                  fill
                  sizes="(max-width: 1024px) 90vw, 900px"
                  fetchPriority="high"
                  className={`artwork-inside-motion ${roundArtwork ? 'rounded-full object-cover' : 'object-contain'}`}
                />
              </div>
            </figure>
          )}

          <div className="mx-auto grid max-w-5xl gap-8 py-14 md:grid-cols-[.7fr_1.3fr] md:py-20">
            <div className="flex items-start gap-4">
              <span className="mt-2 h-px w-12 bg-[#ed7189]" />
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#075f8f]">About the Work</p>
            </div>
            <div>
              {artwork.description ? (
                <p className="text-base leading-8 text-neutral-600 sm:text-lg">{artwork.description}</p>
              ) : (
                <p className="text-base italic text-neutral-400">Artwork details coming soon.</p>
              )}
            </div>
          </div>

          {secondary.length > 0 && (
            <section className="flex flex-col gap-16 border-t border-neutral-200 pt-14 sm:gap-24 sm:pt-20">
              {secondary.map((image, index) => {
                const alignRight = index % 2 === 0;
                return (
                  <figure key={image.id || index} className={`group w-full md:w-[76%] ${alignRight ? 'md:self-end' : 'md:self-start'}`}>
                    <div className={`mb-4 flex items-end gap-4 ${alignRight ? 'justify-end text-right' : ''}`}>
                      <span className="text-5xl font-light leading-none text-[#075f8f]/25" style={{ fontFamily: 'var(--font-cormorant)' }}>
                        {String(index + 2).padStart(2, '0')}
                      </span>
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.24em] text-[#ed7189]">Detail View</p>
                        {image.caption && <figcaption className="mt-1 text-xs italic text-neutral-500">{image.caption}</figcaption>}
                      </div>
                    </div>
                    <div className="editorial-art-frame">
                      <div className="relative h-full w-full">
                        <Image
                          src={image.image_url}
                          alt={image.caption || `${artwork.title} view ${index + 2}`}
                          fill
                          sizes="(max-width: 768px) 90vw, 70vw"
                          loading="lazy"
                          className="artwork-inside-motion object-contain"
                        />
                      </div>
                    </div>
                  </figure>
                );
              })}
            </section>
          )}

          <footer className="mt-16 grid gap-7 border-t border-neutral-200 pt-10 sm:mt-24 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#ed7189]">Collect this work</p>
              <p className="mt-2 text-2xl text-[#063a5b] sm:text-3xl" style={{ fontFamily: 'var(--font-cormorant)' }}>
                {artwork.available ? 'Interested in making this piece yours?' : 'This piece has found its home.'}
              </p>
            </div>
            {artwork.available && (
              <a href={`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`} target="_blank" rel="noopener noreferrer" className="inline-flex justify-center bg-[#075f8f] px-7 py-4 text-[10px] uppercase tracking-[0.2em] text-white transition hover:bg-[#ed7189]">
                Inquire to Purchase
              </a>
            )}
          </footer>
        </div>
      </article>
    </main>
  );
}
