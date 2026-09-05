const ROUND_ARTWORK_IDS = new Set([20, 21]);

export function isRoundArtwork(artwork) {
  return ROUND_ARTWORK_IDS.has(Number(artwork?.id));
}
