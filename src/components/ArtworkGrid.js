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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
      {artworks.map(artwork => (
        <Link
          key={artwork.id}
          href={`/portfolio/${artwork.id}`}
          className="group block"
        >
          <div className="relative transition-transform duration-500 group-hover:scale-[1.02]">
            <img
              src={artwork.image_url}
              alt={artwork.title}
              className="w-full h-auto block"
              style={{ mixBlendMode: 'multiply' }}
            />
            {!artwork.available && (
              <div className="absolute top-3 left-3 bg-neutral-800/80 text-white text-[9px] tracking-[0.25em] uppercase px-3 py-1.5">
                Sold
              </div>
            )}
          </div>

          <div className="mt-5 px-1">
            <h2 className="text-sm text-neutral-700 font-light leading-snug">{artwork.title}</h2>
            {artwork.size && <p className="text-xs text-neutral-400 mt-0.5">{artwork.size}</p>}
            {artwork.price && <p className="text-xs text-neutral-500 mt-1">{artwork.price}</p>}
          </div>
        </Link>
      ))}
    </div>
  );
}
