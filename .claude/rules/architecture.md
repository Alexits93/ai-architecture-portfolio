---
paths:
  - "src/**"
---

# Project structure (ADR 002)

Astro's documented conventions (https://docs.astro.build/en/basics/project-structure/), decided in `docs/adrs/002-astro-conventions.md`. Imports flow `pages/ > layouts/ > components/ > lib/`; ESLint `no-restricted-imports` blocks the reverse direction.

- `pages/`: routes. Markup and scoped `<style>` used by one page stay in that page. A page-only component sits next to the page with a `_` prefix (`src/pages/blog/_BlogFeed.astro`, shared by the `/blog/` routes); the router ignores it.
- `layouts/`: the document shell (`<html>`, `<head>`, global CSS import, header, menu, footer, `<slot />`) and nested layouts. Every page renders through a layout.
- `components/`: components rendered on two or more routes, directly or through a layout, one `.astro` file each, imported by path (no barrel `index.ts`).
- `assets/`: local images and SVGs, imported by components as SVG components (https://docs.astro.build/en/guides/images/#svg-components), never inline `<svg>`.
- `styles/`: tokens and global CSS (reset, tokens, base element styles). Component styles are scoped in the component.
- `content/` and `src/content.config.ts`: repeated structured content as collections. A one-off page keeps its content in the page.
- `lib/`: framework-free TypeScript. No `.astro` imports. Site constants and routes live in `src/consts.ts`; fonts in `src/assets/fonts/`, loaded through the Fonts API (`fonts` in `astro.config.mjs`, `<Font />` in `BaseLayout`) and read by the OG image.
- Import with the `@/` alias across folders, relative paths inside one folder.
- Validate input at boundaries (content schemas, config) and trust it inside.
