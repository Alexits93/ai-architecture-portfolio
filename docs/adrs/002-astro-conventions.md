# ADR 002: Astro conventions instead of Feature-Sliced Design

## Context
The legacy site was a web-components repo: every component was its own custom element, meant to ship as a separate package. The migration ported one legacy component per run into a Feature-Sliced Design (FSD) slice, a model an earlier agent chose and the owner never required. The result copied the legacy breakdown instead of following Astro:
- 7 of 11 widgets and the only feature have one consumer. Even FSD v2.1 says such code belongs in its page.
- The FSD lint plugin had `public-api` switched off for `src/pages`, so deep imports passed.
- No layout existed, and component styles sat in `global.css`.

FSD targets applications. This is a static content site with 6 routes and one client interaction. Its `pages` layer collides with `src/pages`, the only folder Astro reserves.

## Decision
Follow Astro's documented project structure (https://docs.astro.build/en/basics/project-structure/, Astro 7.3.8):

| Folder | Holds |
|---|---|
| `src/pages/` | Routes. Page-only markup and scoped styles stay in the page; page-only components sit next to it with a `_` prefix, which the router ignores (https://docs.astro.build/en/guides/routing/). |
| `src/layouts/` | `BaseLayout.astro` (document shell, head, global CSS, header, menu, footer, `<slot />`) and nested layouts (https://docs.astro.build/en/basics/layouts/). |
| `src/components/` | Components used by two or more routes or layouts. |
| `src/assets/` | Local images and SVGs that components import. An imported `.svg` renders as an inline SVG component (https://docs.astro.build/en/guides/images/#svg-components). |
| `src/styles/` | Tokens and global CSS (reset, tokens, base element styles). Component styles are scoped (https://docs.astro.build/en/guides/styling/). |
| `src/content/`, `src/content.config.ts` | Collections: schema and data for repeated structured content (https://docs.astro.build/en/guides/content-collections/). |
| `src/lib/` | Framework-free TypeScript. |

Imports flow `pages > layouts > components > lib`. ESLint core `no-restricted-imports`, scoped per folder, enforces it; `tests/config/eslint.spec.ts` proves each boundary.

## Consequences
- Positive: one structure that the Astro docs, examples and agents share. No renamed layers, no third-party architecture plugin.
- Positive: page-only code stays in the page, so the folder tree shows what is reused.
- The legacy `src/shared`, `src/entities`, `src/features` and `src/widgets` folders were dissolved into these folders in #232.
