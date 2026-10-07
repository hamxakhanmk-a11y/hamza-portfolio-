// Use intact source photos only for the known damaged exports. New uploads pass through.
const RESTORATIONS = {
  'artworks-3-1787329195616.png': {
    original: '1787046619497.jpg',
    clipPath: 'circle(49% at 50% 50%)',
    scale: 1,
  },
  'artworks-4-1787329200267.png': {
    original: '1787070962764.jpg',
    clipPath: 'circle(41.1% at 50% 49.4%)',
    scale: 1.2,
  },
};

export function getRestoredArtworkImage(src) {
  if (typeof src !== 'string') return null;
  try {
    const url = new URL(src);
    if (url.hostname !== 'dyvcaevtrovicafvxnhe.supabase.co') return null;
    const prefix = '/storage/v1/object/public/artworks/trimmed/';
    if (!url.pathname.startsWith(prefix)) return null;
    const restoration = RESTORATIONS[url.pathname.slice(prefix.length)];
    if (!restoration) return null;
    return {
      src: `${url.origin}/storage/v1/object/public/artworks/${restoration.original}`,
      clipPath: restoration.clipPath,
      scale: restoration.scale,
    };
  } catch {
    return null;
  }
}
