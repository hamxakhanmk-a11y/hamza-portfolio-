// Wall positions ("slots") in the portfolio gallery tour film, in the order the tour reaches them.
// closeUp: the camera stops in front of it; at: seconds into the tour where it is best seen.
export const TOUR_SLOTS = [
  { id: 1, closeUp: true, at: 16 },
  { id: 2, closeUp: true, at: 16 },
  { id: 3, closeUp: true, at: 17 },
  { id: 4, closeUp: true, at: 30 },
  { id: 5, closeUp: true, at: 33 },
  { id: 6, closeUp: true, at: 35 },
  { id: 7, closeUp: true, at: 47 },
  { id: 8, closeUp: true, at: 46 },
  { id: 9, closeUp: true, at: 55 },
  { id: 10, closeUp: true, at: 54 },
  { id: 11, closeUp: true, at: 67 },
  { id: 12, closeUp: true, at: 61 },
  { id: 13, closeUp: true, at: 76 },
  { id: 14, closeUp: true, at: 81 },
  { id: 15, closeUp: true, at: 84 },
  { id: 16, closeUp: false, at: 43 },
  { id: 17, closeUp: false, at: 139 },
  { id: 18, closeUp: true, at: 93 },
  { id: 19, closeUp: true, at: 97 },
  { id: 20, closeUp: true, at: 99 },
  { id: 21, closeUp: true, at: 103 },
  { id: 22, closeUp: true, at: 101 },
  { id: 23, closeUp: true, at: 107 },
  { id: 24, closeUp: true, at: 111 },
  { id: 25, closeUp: true, at: 121 },
  { id: 26, closeUp: true, at: 145 },
  { id: 27, closeUp: true, at: 140 },
  { id: 28, closeUp: true, at: 141 },
];

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
  // close-ups first, so the automatic fill puts the most paintings where visitors see them best
  const order = [...TOUR_SLOTS].sort((a, b) => Number(b.closeUp) - Number(a.closeUp) || a.id - b.id);
  const result = new Map();
  for (const slot of order) {
    const choice = map[slot.id];
    if (choice === 'none') result.set(slot.id, null);
    else if (choice != null && byId.has(String(choice))) result.set(slot.id, byId.get(String(choice)));
    else result.set(slot.id, fallback.length ? fallback[next++ % fallback.length] : null);
  }
  return TOUR_SLOTS.map(slot => ({ slot: slot.id, artwork: result.get(slot.id) }));
}
