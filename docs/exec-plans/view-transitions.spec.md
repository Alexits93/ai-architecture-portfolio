# View Transitions Spec

## 1. Description
Integrate Astro's native `ViewTransitions` API into the application to provide seamless, SPA-like cross-fade navigations without the overhead of a heavy JavaScript bundle.

## 2. Requirements
- The `<ViewTransitions />` component MUST be injected into the `<head>` of all pages.
- The `Header` and `NavigatorMenu` components SHOULD NOT unnecessarily re-render on navigation if possible, though default cross-fade is acceptable.

## 3. Boundaries
- Modifies: `src/pages/*.astro` entry points.
- Depends on: `astro:transitions`.
