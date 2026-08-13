import { createClient } from '@supabase/supabase-js';
import { siteConfig } from '@/data/config';

async function getArtworks() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data, error } = await supabase
      .from('artworks')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

function buildWhatsAppLink(artwork) {
  const message = encodeURIComponent(
    `Hi! I'm interested in "${artwork.title}" (${artwork.price}). Is it still available?`
  );
  return `https://wa.me/${siteConfig.whatsapp}?text=${message}`;
}

export default async function Gallery() {
  const artworks = await getArtworks();
  const newest = artworks.filter(a => a.available);
  const sold = artworks.filter(a => !a.available);

  return (
    <div id="gallery">

      {/* ── Newest Paintings ── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2
            className="text-center text-sm tracking-[0.35em] uppercase mb-16"
            style={{ color: '#3d6478' }}
          >
            Newest Paintings in the Shop:
          </h2>

          {artworks.length === 0 ? (
            <p className="text-center text-neutral-300 text-sm tracking-widest uppercase py-16">
              Artworks coming soon
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {artworks.map((artwork) => (
                <article key={artwork.id} className="group flex flex-col">

                  {/* Framed image */}
                  <div className="relative bg-white p-3 shadow-md mb-5">
                    <div className="aspect-[4/5] bg-neutral-100 overflow-hidden">
                      <img
                        src={artwork.image_url}
                        alt={artwork.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-103"
                      />
                    </div>

                    {/* SOLD badge */}
                    {!artwork.available && (
                      <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-neutral-900 flex items-center justify-center z-10">
                        <span className="text-white text-[10px] tracking-widest uppercase font-medium">
                          Sold
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-col gap-1 px-1">
                    <h3 className="text-sm text-neutral-700">
                      {artwork.title}
                      {artwork.size ? ` ${artwork.size}` : ''}
                    </h3>
                    {artwork.medium && (
                      <p className="text-xs text-neutral-400">{artwork.medium}</p>
                    )}
                    <p className="text-sm text-neutral-600 mt-1">{artwork.price}</p>

                    {artwork.available && (
                      <a
                        href={buildWhatsAppLink(artwork)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 self-start text-xs tracking-[0.2em] uppercase border-b pb-0.5 transition-colors hover:opacity-50"
                        style={{ color: '#3d6478', borderColor: '#3d6478' }}
                      >
                        Inquire to Purchase
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
