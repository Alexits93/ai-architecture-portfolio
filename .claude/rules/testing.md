---
paths:
  - "**/*.spec.ts"
  - "e2e/**"
  - "tests/**"
  - "vitest.config.ts"
  - "playwright.config.ts"
---
# Testing

Test the behavior a visitor, a crawler or a security check depends on: new behavior at risk, and one regression test per fixed bug, written before the fix. Each test must fail if that behavior breaks.

Do not test:
- tooling or config: ESLint rules, Zod basics, file contents, code style read from source;
- copy: content truth is the owner's (CLAUDE.md);
- a component that only passes props to one element;
- exact CSS values, timings or pixel positions, unless a WCAG criterion stands behind them (contrast, reflow, text spacing, target size, reduced motion);
- the same behavior twice. Logic gets a unit test; a page gets an e2e test on the built site.

## Tool split
- Vitest + `experimental_AstroContainer`: component rendering and unit logic, co-located as `src/**/*.spec.ts`.
- Playwright: pages on the built site, multi-page journeys, and anything that needs client `<script>` code to run (AstroContainer does not execute it). Location: `e2e/`, one file per page or feature.
- Vitest specs that import from `src/pages/` live in `tests/`. Astro builds every file in `src/pages/` whose name lacks a `_` prefix (https://docs.astro.build/en/guides/routing/), so a spec there would need one.

## AstroContainer
- Keep `environment: 'node'` in `vitest.config.ts`; jsdom strips the compiler metadata AstroContainer needs. Parse the rendered string with `new JSDOM(html)` inside the test.
- AstroContainer does not read `astro.config.mjs`: `Astro.site` is undefined unless the spec passes `astroConfig: { site }` to `create()`. Pass it whenever the render reaches `SeoHead` or anything else that reads `Astro.site`.

## Guards and mocks
- A missing value fails at a guard: `assert.exists(el)` or `assert.instanceOf` from `vitest` (https://vitest.dev/api/assert), `assert(value !== null)` after `import assert from 'node:assert/strict'` in Playwright specs. A value that may legitimately be absent gets an explicit branch (`key in map ? map[key] : fallback`).
- Vitest has no content store: `getCollection` and `getEntry` return nothing, and the store a local dev server writes hides that until CI. A spec that renders a route page mocks `astro:content` with fixtures; real entries are checked in Playwright on the built page.

## Visual check
Run `pnpm build`, then a short Playwright script that saves a screenshot, then read the PNG.

A failure that shows up only in CI is reproduced locally, and its screenshot read, before any code change. Local WebKit runs in the Playwright image of the installed version under Podman (`run-server`, https://playwright.dev/docs/docker): `pnpm test:e2e:webkit` after `pnpm build` starts and stops the container through `playwright.config.ts`. Never push a guessed fix to test it in CI.
