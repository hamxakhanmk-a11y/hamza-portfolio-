import { createClient } from '@supabase/supabase-js';
import GalleryTour from '@/components/GalleryTour';
import { TOUR_SETTING_KEY, parseTourMap, resolveTourSlots } from '@/data/galleryTour';
import { isRoundArtwork } from '@/data/artworkPresentation';
import { siteConfig } from '@/data/config';

export default async function HomeGalleryTour() {
  let artworks = [], map = parseTourMap();
  try {
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const [pieces, setting] = await Promise.all([
      client.from('artworks').select('*').in('section', ['portfolio', 'shop']).eq('show_on_website', true).order('display_order', { ascending: true }).order('created_at', { ascending: false }),
      client.from('site_text').select('value').eq('key', TOUR_SETTING_KEY).maybeSingle(),
    ]);
    artworks = pieces.data || [];
    map = parseTourMap(setting.data?.value);
  } catch { /* The collection below remains available if the tour cannot load. */ }
  const slots = resolveTourSlots(map, artworks).map(({ slot, artwork }) => ({
    slot,
    artwork: artwork && {
      id: artwork.id, title: artwork.title, image_url: artwork.image_url,
      size: artwork.size, medium: artwork.medium, price: artwork.price,
      available: artwork.available, round: isRoundArtwork(artwork),
    },
  }));
  return <GalleryTour slots={slots} artistName={siteConfig.artistName} descendFromSky collectionId="gallery" />;
}
