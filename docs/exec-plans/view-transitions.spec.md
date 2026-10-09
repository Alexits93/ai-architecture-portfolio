# View Transitions Spec

## 1. Description
Enable seamless, SPA-like cross-fade navigations without the overhead of a JavaScript bundle by utilizing the browser's native CSS View Transitions API.

## 2. Requirements
- We DO NOT use Astro's `<ClientRouter />` or `<ViewTransitions />`. These introduce framework-specific JS overhead.
- Instead, we leverage the native `@view-transition { navigation: auto; }` standard.
- The CSS declaration MUST be added to `global.css`.

## 3. Boundaries
- Modifies: `src/shared/styles/global.css`.
- Removes: `astro:transitions` dependencies.
