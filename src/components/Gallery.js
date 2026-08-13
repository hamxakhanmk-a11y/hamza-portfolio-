import { artworks } from "@/data/artworks";
import { siteConfig } from "@/data/config";

function buildWhatsAppLink(artwork) {
  const message = encodeURIComponent(
    `Hi! I'm interested in "${artwork.title}" (${artwork.price}). Is it still available?`
  );
  return `https://wa.me/${siteConfig.whatsapp}?text=${message}`;
}

export default function Gallery() {
  return (
    <section id="gallery" className="py-28 bg-white">
      <div className="max-w-6xl mx-auto px-6">

        <div className="mb-16">
          <p className="text-xs tracking-[0.35em] uppercase text-neutral-400 mb-3">Portfolio</p>
          <h2
            className="text-5xl font-light text-neutral-900"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Works
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
          {artworks.map((artwork) => (
            <article key={artwork.id} className="group">

              {/* Image */}
              <div className="relative aspect-[4/5] bg-neutral-100 overflow-hidden mb-5">
                <img
                  src={artwork.image}
                  alt={artwork.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {!artwork.available && (
                  <div className="absolute top-4 left-4 bg-white text-neutral-600 text-xs tracking-[0.2em] uppercase px-3 py-1">
                    Sold
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-col gap-1">
                <h3
                  className="text-xl font-medium text-neutral-900"
                  style={{ fontFamily: "var(--font-cormorant)" }}
                >
                  {artwork.title}
                </h3>
                <p className="text-sm text-neutral-500">{artwork.medium}</p>
                <p className="text-xs text-neutral-400">{artwork.size}</p>

                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-neutral-700">{artwork.price}</span>
                  {artwork.available ? (
                    <a
                      href={buildWhatsAppLink(artwork)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs tracking-[0.15em] uppercase border border-neutral-900 px-4 py-2 hover:bg-neutral-900 hover:text-white transition-colors"
                    >
                      Inquire
                    </a>
                  ) : (
                    <span className="text-xs tracking-[0.15em] uppercase text-neutral-300">
                      Sold
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
