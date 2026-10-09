---
paths:
  - "**/*.spec.ts"
  - "e2e/**"
  - "tests/**"
  - "vitest.config.ts"
  - "playwright.config.ts"
---
# Testing

Write the failing test first, then the code (TDD). While a feature is in progress, each new test traces to a row in the behavioral matrix of its Task issue.

## Tool split
- Vitest + `experimental_AstroContainer`: component rendering and unit logic, co-located as `src/**/*.spec.ts`. Never use Playwright for isolated component state; it is slower and flakier.
- Playwright: multi-page journeys and anything that needs client `<script>` code to run (AstroContainer does not execute it). Location: `e2e/`, or `tests/pages/` for page-level browser tests.
- Tests that import from `src/pages/` live in `tests/`, because a co-located page test would break FSD lint rules.

## AstroContainer
- Keep `environment: 'node'` in `vitest.config.ts`; jsdom strips the compiler metadata AstroContainer needs. Parse the rendered string with `new JSDOM(html)` inside the test.
- AstroContainer inherits `site` from `astro.config.mjs`. Do not write tests that expect `Astro.site` to be undefined.
- Assert on the exact classes child components render (for example `.skill-tag`).

## Types and mocks
- Same strictness as production: no `any`, no `unknown`, no `as` casts to bypass types. Use `Partial<T>` or a fixture that matches the real interface.
- `vi.mock()` for modules, `vi.fn()` for spies, `vi.clearAllMocks()` in `beforeEach`.

## Coverage
Per-file 100% lines, branches, functions and statements on `src/**/*.ts`. v8 does not measure `.astro` files; container tests and e2e cover those.

## Visual check
Run `pnpm build`, then a short Playwright script that saves a screenshot, then read the PNG.
