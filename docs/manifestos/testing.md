# Testing Boundaries (The "Right Tool" Law)

This project mandates a strict separation of concerns for testing, utilizing tools exclusively for their native strengths:

## 1. Vitest & Astro Container (Component Isolation)
- **Role:** Unit testing, component logic, and isolated rendering.
- **Location:** `src/**/*.spec.ts`
- **Rule:** Never use Playwright to test isolated component states or unit logic. Always use Astro's `experimental_AstroContainer` within Vitest to render `.astro` files and test their HTML output or logic locally. Vitest is extremely fast and enforces our 100% coverage threshold.

## 2. Playwright (Multi-Page E2E Journeys)
- **Role:** User journeys, multi-page state persistence (e.g., Nano Stores `localStorage` syncing across MPAs), and full-stack integration.
- **Location:** `e2e/**/*.spec.ts`
- **Rule:** E2E tests must never test granular component logic (e.g., "does this button have a red border"). They must test end-to-end user flows (e.g., "does the theme remain dark after navigating to another page").
- **Deterministic Boundary:** Vitest is explicitly configured in `vitest.config.ts` to exclude the `e2e/` directory. Playwright is configured in `playwright.config.ts` to strictly target the `e2e/` directory.

By adhering to this, we eliminate the flakiness of slow E2E tests for simple components and ensure our MPA state behaves correctly in real browsers.
