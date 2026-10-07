import assert from 'node:assert/strict';
import test from 'node:test';
import { getRestoredArtworkImage } from '../src/data/artworkImageRestoration.js';

const base = 'https://dyvcaevtrovicafvxnhe.supabase.co/storage/v1/object/public/artworks/';

test('known cutouts resolve to intact source photos with an exterior-only display mask', () => {
  const blue = getRestoredArtworkImage(`${base}trimmed/artworks-4-1787329200267.png`);
  assert.equal(blue.src, `${base}1787070962764.jpg`);
  assert.match(blue.clipPath, /^circle/);
  const gold = getRestoredArtworkImage(`${base}trimmed/artworks-3-1787329195616.png`);
  assert.equal(gold.src, `${base}1787046619497.jpg`);
});

test('unrelated paintings, new uploads, and other hosts are not changed', () => {
  assert.equal(getRestoredArtworkImage(`${base}new-upload.png`), null);
  assert.equal(getRestoredArtworkImage(`${base}trimmed/artworks-4-new.png`), null);
  assert.equal(getRestoredArtworkImage('https://example.com/trimmed/artworks-4-1787329200267.png'), null);
  assert.equal(getRestoredArtworkImage(undefined), null);
  assert.equal(getRestoredArtworkImage('/local.png'), null);
});
