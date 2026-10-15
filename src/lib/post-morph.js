// Card-to-post morph (#210). A cross-document view transition pairs a card's title with the post's, which needs
// one name on each page: pageswap names it on the old page, pagereveal on the new one, and both
// remove the name afterwards (https://developer.chrome.com/docs/web-platform/view-transitions/cross-document).
// pagereveal must be heard before the first render, so astro.config.mjs injects this file as a classic inline <head>
// script, which Astro hashes into script-src; a module script ran too late on a warm cache. Post pages render-block
// on #post-hero with <link rel="expect">, so the header exists when pagereveal fires. Engines without these events
// navigate as before. A block, not globals.
{
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const pathOf = (url) => (url ? new URL(url).pathname : null);
  const cardFor = (path) =>
    [...document.querySelectorAll('[data-post-card]')].find((card) => card.getAttribute('href') === path) ?? null;
  const hero = () => document.getElementById('post-hero');
  // The entry this page was reached from. An engine can have view transitions without the Navigation API; then only
  // the post header is named (#338).
  const previousEntry = () =>
    typeof navigation !== 'undefined' && navigation.activation ? navigation.activation.from : null;

  // Names the title inside scope until the given transition promise settles.
  const nameTitle = (scope, until) => {
    if (!scope || reduceMotion.matches) return;
    const title = scope.querySelector('[data-morph="title"]');
    if (!title) return;
    title.style.viewTransitionName = 'post-title';
    const clear = () => (title.style.viewTransitionName = '');
    until.then(clear, clear);
  };

  // Old page: the card for the post being opened, else this post's own header (going back or onwards).
  addEventListener('pageswap', (event) => {
    if (!event.viewTransition || !event.activation) return;
    nameTitle(cardFor(pathOf(event.activation.entry.url)) ?? hero(), event.viewTransition.finished);
  });

  // New page: this post's header, else the card of the post we came back from.
  addEventListener('pagereveal', (event) => {
    if (!event.viewTransition) return;
    const from = previousEntry();
    nameTitle(hero() ?? cardFor(pathOf(from && from.url)), event.viewTransition.ready);
  });
}
