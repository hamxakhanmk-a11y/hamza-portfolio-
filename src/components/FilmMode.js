'use client';

import { useEffect } from 'react';
import { HOME_DESCENT_SVH } from '@/data/galleryTour';

// Film mode (test site only): a small button on Home that replays the page from the water intro to the end
// of Home by itself, slowly and smoothly, so it can be screen-recorded. It reloads to "/?film=1" so the
// intro plays from the start, then glides through the hero stages, the descent, every gallery stop and the
// sections below. Any wheel, touch or key stops it, except the gallery's Day / Night switch, which can be
// used while it films. Hidden on the production site (see next.config.mjs).

const ENABLED = process.env.NEXT_PUBLIC_FILM_MODE === '1';
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
// Read once when the page loads: React may run the effect twice (development), and the first run tidies
// "?film=1" out of the address, so the request has to outlive it.
let filmRequested = ENABLED && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('film') === '1';

export default function FilmMode() {
  useEffect(() => {
    if (!filmRequested) return;
    if (window.location.search) window.history.replaceState(null, '', '/');
    const root = document.documentElement;
    const stop = new AbortController();
    const { signal } = stop;
    root.dataset.film = 'playing'; // also hides the button (globals.css)

    const wait = seconds => new Promise(resolve => {
      const timer = setTimeout(resolve, seconds * 1000);
      signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
    });
    const until = (test, seconds = 60) => new Promise(resolve => {
      const started = performance.now();
      const check = () => (signal.aborted || test() || performance.now() - started > seconds * 1000 ? resolve() : requestAnimationFrame(check));
      check();
    });
    // move the page smoothly to y (ease in and out), like a camera dolly
    const glide = (y, seconds) => new Promise(resolve => {
      const from = window.scrollY, started = performance.now();
      const step = now => {
        if (signal.aborted) { resolve(); return; }
        const k = Math.min(1, (now - started) / (seconds * 1000));
        window.scrollTo({ top: from + (y - from) * ease(k), behavior: 'instant' });
        if (k < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
    const topOf = element => element.getBoundingClientRect().top + window.scrollY;

    (async () => {
      await until(() => !root.dataset.splash);                     // the water intro plays by itself
      await wait(1.5);                                             // the title settles
      const hero = document.querySelector('[data-hero-stages]');
      if (hero) {
        const start = topOf(hero), end = start + hero.offsetHeight - window.innerHeight;
        for (let stage = 1; stage <= 3 && !signal.aborted; stage++) {
          await glide(start + (end - start) * stage / 3, 1.6);
          await wait(1.6);
        }
      }
      const gallery = document.getElementById('gallery-tour');
      if (gallery && !signal.aborted) {
        await until(() => gallery.dataset.ready === 'true');
        const stops = gallery.filmStops?.() || [];
        // down through the clouds into the gallery
        await glide(stops[0]?.y ?? topOf(gallery) + window.innerHeight * HOME_DESCENT_SVH / 100, 7);
        await wait(1.5);
        for (let k = 1; k < stops.length && !signal.aborted; k++) {
          await glide(stops[k].y, 2.6);
          await wait(stops[k].kind === 'bay' ? 1 : stops[k].kind === 'end' ? 1.5 : 0.5);
        }
      }
      // on through the collection, the commission section and the footer
      const collection = document.getElementById('gallery');
      if (collection && !signal.aborted) { await glide(topOf(collection) - 40, 2.4); await wait(1.6); }
      const commission = document.querySelector('.commission-inquiry-home');
      if (commission && !signal.aborted) { await glide(topOf(commission) - 60, 2.2); await wait(1.6); }
      if (!signal.aborted) { await glide(document.documentElement.scrollHeight - window.innerHeight, 2); await wait(1.5); }
      if (!signal.aborted) finish(); // a cancelled run (React re-running the effect) leaves the new one alone
    })();

    function finish(played = true) {
      if (played) filmRequested = false; // done, or the visitor took over
      delete root.dataset.film;
      delete root.dataset.filmCursor;
      clearTimeout(cursorTimer);
      ['wheel', 'touchstart', 'keydown'].forEach(type => window.removeEventListener(type, takeOver, true));
      window.removeEventListener('mousemove', showCursor);
    }
    // the visitor takes over: stop at once (but the gallery's Day / Night switch may be used while it films)
    function takeOver(event) {
      if (event.target?.closest?.('[aria-label="Gallery lighting"]')) return;
      if (!signal.aborted) { stop.abort(); finish(); }
    }
    ['wheel', 'touchstart', 'keydown'].forEach(type => window.addEventListener(type, takeOver, true));
    // the cursor shows while the mouse moves (to reach the Day / Night switch) and hides again after a moment
    let cursorTimer = 0;
    function showCursor() {
      root.dataset.filmCursor = 'on';
      clearTimeout(cursorTimer);
      cursorTimer = setTimeout(() => { delete root.dataset.filmCursor; }, 1500);
    }
    window.addEventListener('mousemove', showCursor);
    return () => { stop.abort(); finish(false); };
  }, []);

  if (!ENABLED) return null;
  return (
    <button
      type="button"
      // a full reload, so the water intro plays from the very start
      onClick={() => { window.history.replaceState(null, '', '/?film=1'); window.location.reload(); }}
      title="Plays the home page by itself, from the intro to the end, for filming (test site only)"
      className="film-button fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full bg-[#022d47]/80 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-white shadow-lg backdrop-blur transition hover:bg-[#075f8f]"
    >
      <span className="block h-2 w-2 rounded-full bg-[#ed7189]" aria-hidden="true" />
      Film
    </button>
  );
}
