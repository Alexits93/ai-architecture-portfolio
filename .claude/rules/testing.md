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
- Tests that import from `src/pages/` live in `tests/pages/`. Astro builds every file in `src/pages/` whose name lacks a `_` prefix (https://docs.astro.build/en/guides/routing/), so a spec there would need one.

## AstroContainer
- Keep `environment: 'node'` in `vitest.config.ts`; jsdom strips the compiler metadata AstroContainer needs. Parse the rendered string with `new JSDOM(html)` inside the test.
- AstroContainer does not read `astro.config.mjs`: `Astro.site` is undefined unless the spec passes `astroConfig: { site }` to `create()`. Pass it whenever the render reaches `SeoHead` or anything else that reads `Astro.site`.
- Assert on the exact classes child components render (for example `.skill-tag`).

## Types and mocks
- Same strictness as production: no `any`, no `unknown`, no `as` casts to bypass types. Use `Partial<T>` or a fixture that matches the real interface.
- No optional chaining (`?.`), `??` fallbacks or `!` non-null assertions in specs. They route around a missing value: `expect(el?.textContent ?? '').not.toContain(x)` passes when `el` is absent, and the type check stops proving the value exists. Guard instead, so a missing value fails at the guard and the type narrows: `assert.exists(el)` or `assert.instanceOf` from `vitest` (https://vitest.dev/api/assert), `assert(value !== null)` after `import assert from 'node:assert/strict'` in Playwright specs. A value that may legitimately be absent gets an explicit branch (`key in map ? map[key] : fallback`). ESLint enforces this in `**/*.spec.ts`, `tests/**` and `e2e/**` (#138).
- `vi.mock()` for modules, `vi.fn()` for spies, `vi.clearAllMocks()` in `beforeEach`.

## Coverage
Per-file 100% lines, branches, functions and statements on `src/**` except `src/pages/` (see `vitest.config.ts`). v8 measures `.astro` frontmatter and template expressions through container renders. A fallback for a value the content schema guarantees is a dead branch: remove it, never fake a fixture to cover it.

## Visual check
Run `pnpm build`, then a short Playwright script that saves a screenshot, then read the PNG.

A failure that shows up only in CI is reproduced locally, and its screenshot read, before any code change. Local WebKit runs in the Playwright image of the installed version under Podman (`run-server`, https://playwright.dev/docs/docker). Never push a guessed fix to test it in CI.
