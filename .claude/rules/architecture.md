---
paths:
  - "src/**"
---
# Project structure (ADR 002)

Astro's documented conventions (https://docs.astro.build/en/basics/project-structure/), decided in `docs/adrs/002-astro-conventions.md`. Imports flow `pages/ > layouts/ > components/ > lib/`; ESLint `no-restricted-imports` blocks the reverse direction.

- `pages/`: routes. Markup and scoped `<style>` used by one page stay in that page. A page-only component sits next to the page with a `_` prefix (`src/pages/blog/_BlogFeed.astro`, shared by the `/blog/` routes); the router ignores it.
- `layouts/`: the document shell (`<html>`, `<head>`, global CSS import, header, menu, footer, `<slot />`) and nested layouts. Every page renders through a layout.
- `components/`: only components that two or more routes or layouts use. A `ui/` subfolder holds domain-free building blocks.
- `assets/`: local images and SVGs, imported by components as SVG components (https://docs.astro.build/en/guides/images/#svg-components). `tests/architecture/project-structure.spec.ts` fails on any `<svg` in a `src/**/*.astro` file.
- `styles/`: tokens and global CSS (reset, tokens, base element styles). Component styles are scoped in the component.
- `content/` and `src/content.config.ts`: repeated structured content as collections. A one-off page keeps its content in the page.
- `lib/`: framework-free TypeScript. No `.astro` imports.
- Import with the `@/` alias across folders, relative paths inside one folder.
- Validate input at boundaries (content schemas, config) and trust it inside.
- `src/shared`, `src/entities` and `src/widgets` are legacy folders that Story #76 moves into the target folders. New code goes to the target folders.
