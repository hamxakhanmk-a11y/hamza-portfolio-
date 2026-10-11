// Remembers each page's scroll position so Back/Forward can return the visitor to where they were.
// The layout turns off the browser's own restoration (history.scrollRestoration = 'manual').

const positions = new Map();
let traversalAt = -Infinity;

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => { traversalAt = performance.now(); });
}

export function rememberPosition(path, y) {
  positions.set(path, y);
}

export function savedPosition(path) {
  return positions.get(path);
}

// true while a Back/Forward navigation is being rendered
export function isHistoryTraversal() {
  return performance.now() - traversalAt < 1500;
}
