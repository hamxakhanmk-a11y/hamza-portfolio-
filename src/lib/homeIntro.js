// The home page's automatic opening plays once per page load: on a first visit or a refresh, but not
// when coming back to Home from another page. Once it has played, the opening is taken out of the
// layout so the visitor can't scroll back up into it. This state lives in memory, so a reload resets it.

let state = 'pending'; // pending → running → done

export function introState() {
  return state;
}

export function startIntro() {
  state = 'running';
}

// The page went away before the opening began moving (or React re-ran the effect): it hasn't played yet.
export function cancelIntro() {
  if (state === 'running') state = 'pending';
}

// Remove the opening from the layout. Pass the current scroll position to keep the view exactly
// where it is (everything below the opening moves up by its height, and so does the scroll).
export function finishIntro(scrollTo) {
  state = 'done';
  const root = document.documentElement;
  if (root.dataset.introDone === 'true') return;
  const sky = document.querySelector('[data-home-sky]');
  const removedHeight = sky?.offsetHeight || 0;
  const banner = document.querySelector('.intro-embedded');
  const before = banner?.getBoundingClientRect().top;
  const y = window.scrollY;
  const previousAnchor = root.style.overflowAnchor;
  root.style.overflowAnchor = 'none';
  root.dataset.introDone = 'true';
  // Measure the actual layout change; offsetTop is relative to an offset
  // parent and isn't necessarily the amount removed from the document.
  const shift = banner && before != null ? banner.getBoundingClientRect().top - before : -removedHeight;
  const target = Math.max(0, y + shift);
  window.scrollTo({ top: target, left: 0, behavior: 'instant' });
  scrollTo?.(target);
  requestAnimationFrame(() => { root.style.overflowAnchor = previousAnchor; });
}
