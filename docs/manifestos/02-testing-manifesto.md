# 02 - Testing Manifesto (2026 Industry Standard)

## 1. Zero-Trust Type Strictness
Tests are not second-class citizens. They must adhere to the exact same type strictness as production code.
- **Banned:** `any` and `unknown` types are absolutely prohibited in `*.test.ts` or `*.spec.ts` files.
- **Banned:** Casting (`as unknown as Type`, `as any`) is prohibited. Mock objects must strictly conform to the actual interfaces. Use `Partial<T>` if testing partial structures, but never subvert the type system.

## 2. Test-Driven Development (TDD) via Vitest
Code is written only to satisfy a failing test, following the **Testing Trophy** methodology (prioritizing integration over isolated unit testing).
1. Write `*.devspec.md` (Behavioral Matrix).
2. Write a failing test in **Vitest**.
3. Implement the feature to pass the test.

## 3. Vitest Architectural Standards
- **Isolation & Setup:** Do not mutate shared state in `beforeEach`. Test setups must be completely pure. Always use `vi.clearAllMocks()` in `beforeEach` to prevent leakage.
- **Mocking:** Standardize on `vi.mock()` for module-level mocking and `vi.fn()` for spies. Network mocking must strictly use **MSW (Mock Service Worker)**; do not mock the global `fetch` directly.
- **Browser Fidelity:** Use Vitest Native Browser Mode (powered by Playwright) for component integration tests to guarantee real CSS/pointer event behavior, eschewing `jsdom` where layout fidelity matters.

## 4. Coverage
- Branches, functions, and lines must maintain 100% coverage for core utilities and logic domains.

## 5. Astro Component Testing
- **AstroContainer:** When testing `.astro` components in Vitest via `experimental_AstroContainer`, configure `environment: 'node'` in `vitest.config.ts` to preserve `isAstroComponentFactory` compiler metadata. Import `JSDOM` manually inside the test file to parse the HTML string.
- **SVG Constraints:** Do not include XML declarations (`<?xml version="1.0" encoding="UTF-8"?>`) inside Astro HTML/SVG templates; they are invalid HTML and will break the Astro compiler.

## Local Visual Verification (Chrome-Free)
To perform in-browser visual verifications without installing OS-level browsers or using external MCPs, the AI must use the natively installed `playwright` package.
- Start the Astro dev server (`pnpm dev`).
- Run a short Playwright script to capture screenshots (`page.screenshot()`).
- Use the native `view_file` tool to inspect the image.

## 6. Testing & FSD Boundaries
- **Page Tests:** To prevent FSD `layers-slices` eslint errors without using `eslint-disable` bypasses, tests for `src/pages/` components must be placed in the root `tests/` directory instead of co-locating them in `src/pages/`.
