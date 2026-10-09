// Places on the walls of the 3D gallery walk, in the order the camera reaches them.
// The route follows the reference film: the entrance hall, a corridor into the great hall,
// the side hall, then upstairs into the glass hall. `where` is shown in the admin.
export const TOUR_SLOTS = [
  { id: 1, where: 'Entrance hall · right wall · first pair' },
  { id: 2, where: 'Entrance hall · right wall · first pair' },
  { id: 3, where: 'Entrance hall · right wall · by the doorway' },
  { id: 4, where: 'Entrance hall · left wall · trio' },
  { id: 5, where: 'Entrance hall · left wall · trio' },
  { id: 6, where: 'Entrance hall · left wall · trio' },
  { id: 7, where: 'Great hall · left wall · first pair' },
  { id: 8, where: 'Great hall · left wall · first pair' },
  { id: 9, where: 'Great hall · right wall · second pair' },
  { id: 10, where: 'Great hall · right wall · second pair' },
  { id: 11, where: 'Great hall · left wall · third pair' },
  { id: 12, where: 'Great hall · left wall · third pair' },
  { id: 13, where: 'Great hall · right wall · fourth pair' },
  { id: 14, where: 'Great hall · right wall · fourth pair' },
  { id: 15, where: 'Side hall · right wall · trio' },
  { id: 16, where: 'Side hall · right wall · trio' },
  { id: 17, where: 'Side hall · right wall · trio' },
  { id: 18, where: 'Glass hall (first floor) · first' },
  { id: 19, where: 'Glass hall (first floor) · pair' },
  { id: 20, where: 'Glass hall (first floor) · pair' },
  { id: 21, where: 'Glass hall (first floor) · last' },
];

export const TOUR_SETTING_KEY = 'gallery_tour_slots';

// Curated arrangement; unused positions remain empty.
export const DEFAULT_TOUR_MAP = {
  1: 6, 2: 'none', 3: 'none', 4: 11, 5: 13, 6: 'none',
  7: 7, 8: 12, 9: 16, 10: 10, 11: 15, 12: 'none',
  13: 8, 14: 'none', 15: 14, 16: 'none', 17: 'none',
  18: 3, 19: 4, 20: 5, 21: 'none',
};

export function parseTourMap(value) {
  try {
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? { ...DEFAULT_TOUR_MAP, ...parsed } : { ...DEFAULT_TOUR_MAP };
  } catch {
    return { ...DEFAULT_TOUR_MAP };
  }
}

// Saved choice per slot: an artwork id, 'none' for a bare wall, or missing for automatic.
// Automatic slots take the paintings not chosen anywhere else, in the order given, then repeat.
export function resolveTourSlots(map, artworks) {
  map = { ...DEFAULT_TOUR_MAP, ...map };
  const usable = artworks.filter(artwork => artwork.image_url && artwork.section !== 'commissions');
  const byId = new Map(usable.map(artwork => [String(artwork.id), artwork]));
  const chosen = new Set(Object.values(map).map(String).filter(id => byId.has(id)));
  const pool = usable.filter(artwork => !chosen.has(String(artwork.id)));
  const fallback = pool.length ? pool : usable;
  let next = 0;
  return TOUR_SLOTS.map(slot => {
    const choice = map[slot.id];
    if (choice === 'none') return { slot: slot.id, artwork: null };
    if (choice != null) return { slot: slot.id, artwork: byId.get(String(choice)) || null };
    return { slot: slot.id, artwork: fallback.length ? fallback[next++ % fallback.length] : null };
  });
}
