// Resolves once the home page's splash opening has finished (or straight away when none is playing),
// so heavy below-the-fold scenes can wait instead of making the opening stutter while they build.
export function splashDone() {
  const root = document.documentElement;
  if (!root.dataset.splash) return Promise.resolve();
  return new Promise(resolve => {
    const observer = new MutationObserver(() => {
      if (root.dataset.splash) return;
      observer.disconnect();
      resolve();
    });
    observer.observe(root, { attributes: true, attributeFilter: ['data-splash'] });
  });
}
