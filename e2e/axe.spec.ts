import { globSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

// An automated WCAG 2.2 AA rule scan. Playwright has no built-in rule scan, so axe runs through
// @axe-core/playwright (https://playwright.dev/docs/accessibility-testing). axe tags are not cumulative, so every
// level is listed (https://github.com/dequelabs/axe-core/blob/v4.13.0/doc/API.md#axe-core-tags).
const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// The ids of the violated rules, so a failure names them.
const violations = async (page: Page) => {
  const results = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
  return results.violations.map((violation) => violation.id);
};

test('names the rule of a known violation', async ({ page }) => {
  // Injected, not a built route: a page under src/pages/ would ship.
  await page.setContent('<!doctype html><html lang="en"><title>Fixture</title><main><img src="a.png"></main></html>');
  expect(await violations(page)).toEqual(['image-alt']);
});

// Every built page, read from dist/ as in csp.spec.ts, so a new page is scanned without a list edit.
const ROUTES = globSync('**/*.html', { cwd: 'dist' }).map((file) => `/${file.replace(/index\.html$/, '')}`);
test('finds the built pages', () => expect(ROUTES.length).toBeGreaterThan(5));

// Reduced motion shows every animation at its end state. The hero fades in over time, but the service cards settle
// through a scroll-driven animation and sit at opacity .4 until scrolled into view, so animationsSettled() would
// leave them mid-fade and color-contrast would flag text a reader only sees at full opacity.
// axe reports gradient text (the hero name, the .accent heading words) as incomplete, not as a violation: it cannot
// compute a contrast ratio against a gradient. e2e/contrast.spec.ts samples those gradients instead.
test.describe('built pages', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const route of ROUTES) {
    for (const theme of ['light', 'dark']) {
      test(`${route} has no WCAG 2.2 AA violations in the ${theme} theme`, async ({ page }) => {
        await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
        await page.goto(route);
        // Closed FAQ answers are hidden through ::details-content and axe skips them; one open answer covers their styles.
        if (route === '/') {
          const question = page.locator('#faq details').first();
          await question.locator('summary').click();
          await expect(question).toHaveAttribute('open');
        }
        expect(await violations(page)).toEqual([]);
      });
    }
  }
});
