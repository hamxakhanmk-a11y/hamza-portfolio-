import Link from 'next/link';
import BalancedArtworkImage from '@/components/BalancedArtworkImage';

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
          <div className="relative mt-auto flex aspect-square w-full items-end justify-center transition-transform duration-500 group-hover:-translate-y-1">
            <BalancedArtworkImage
              src={artwork.image_url}
              alt={artwork.title}
            />
            {!artwork.available && (
              <div className="absolute top-3 left-3 bg-neutral-800/80 text-white text-[9px] tracking-[0.25em] uppercase px-3 py-1.5">
                Sold
              </div>
            )}
          </div>

          <div className="mt-5 min-h-6 px-1 text-center">
            <h2 className="line-clamp-1 text-sm font-light leading-snug text-neutral-700">{artwork.title}</h2>
          </div>
        </Link>
      ))}
    </div>
  );
}
