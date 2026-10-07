# 02 - Testing Manifesto

## 1. Test-Driven Development (TDD)
Code is written only to satisfy a failing test. The cycle is:
1. Write `*.devspec.md` (Behavioral Matrix).
2. Write a failing test in Vitest/Playwright.
3. Implement the feature to pass the test.

## 2. Tooling
- **Unit/Component Tests:** `Vitest` for fast execution.
- **E2E/Integration:** `Playwright` for real browser interaction and visual regressions.
- **Accessibility:** `axe-core` integrated into Playwright.

## 3. Coverage
- Branches, functions, and lines must maintain 100% coverage for core utilities and logic.
