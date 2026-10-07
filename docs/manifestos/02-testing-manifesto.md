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
- **AstroContainer:** When testing `.astro` components in Vitest via `experimental_AstroContainer`, use `environment: 'node'` in `vitest.config.ts`. The `jsdom` environment strips `isAstroComponentFactory` metadata causing a `NoMatchingRenderer` error. Import `JSDOM` manually inside the test file to parse the HTML string.
- **SVG Constraints:** Do not leave `<?xml version="1.0" encoding="UTF-8"?>` tags inside Astro HTML/SVG templates, as it breaks the Astro compiler.
