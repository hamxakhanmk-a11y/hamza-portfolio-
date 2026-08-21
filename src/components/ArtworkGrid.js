import Link from 'next/link';

export default function ArtworkGrid({ artworks, emptyMessage = 'Coming soon' }) {
  if (!artworks || artworks.length === 0) {
    return (
      <p className="text-center text-neutral-300 text-sm tracking-widest uppercase py-24">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 sm:gap-y-16 lg:grid-cols-3 lg:gap-x-10">
      {artworks.map(artwork => (
        <Link
          key={artwork.id}
          href={`/portfolio/${artwork.id}`}
          className="group flex h-full flex-col"
        >
          <div className="relative w-fit max-w-full mx-auto mt-auto transition-transform duration-500 group-hover:-translate-y-1">
            <img
              src={artwork.image_url}
              alt={artwork.title}
              className="max-w-full w-auto h-auto max-h-[520px] block"
              style={{
                mixBlendMode: 'multiply',
                filter: artwork.image_url?.toLowerCase().includes('.png')
                  ? 'drop-shadow(0 18px 14px rgba(0,0,0,.16))'
                  : 'none',
              }}
            />
            {!artwork.available && (
              <div className="absolute top-3 left-3 bg-neutral-800/80 text-white text-[9px] tracking-[0.25em] uppercase px-3 py-1.5">
                Sold
              </div>
            )}
          </div>

          <div className="mt-5 px-1 min-h-6">
            <h2 className="text-sm text-neutral-700 font-light leading-snug line-clamp-1">{artwork.title}</h2>
          </div>
        </Link>
      ))}
    </div>
  );
}
