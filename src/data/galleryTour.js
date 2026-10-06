// Places on the walls of the 3D gallery walk, in the order the camera reaches them.
// side: -1 left wall, 1 right wall.
export const TOUR_SLOTS = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, side: i % 2 === 0 ? -1 : 1 }));

export const TOUR_SETTING_KEY = 'gallery_tour_slots';

export function parseTourMap(value) {
  try {
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

// Saved choice per slot: an artwork id, 'none' for a bare wall, or missing for automatic.
// Automatic slots take the paintings not chosen anywhere else, in portfolio order, then repeat.
export function resolveTourSlots(map, artworks) {
  const usable = artworks.filter(artwork => artwork.image_url);
  const byId = new Map(usable.map(artwork => [String(artwork.id), artwork]));
  const chosen = new Set(Object.values(map).map(String).filter(id => byId.has(id)));
  const pool = usable.filter(artwork => !chosen.has(String(artwork.id)));
  const fallback = pool.length ? pool : usable;
  let next = 0;
  const order = TOUR_SLOTS;
  const result = new Map();
  for (const slot of order) {
    const choice = map[slot.id];
    if (choice === 'none') result.set(slot.id, null);
    else if (choice != null && byId.has(String(choice))) result.set(slot.id, byId.get(String(choice)));
    else result.set(slot.id, fallback.length ? fallback[next++ % fallback.length] : null);
  }
  return TOUR_SLOTS.map(slot => ({ slot: slot.id, artwork: result.get(slot.id) }));
}
