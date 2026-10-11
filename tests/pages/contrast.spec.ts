import assert from 'node:assert/strict';
import { test, expect, type Locator } from '@playwright/test';

// WCAG 2.2 SC 1.4.11: icons and the marks that identify a control need 3:1 against adjacent colours.
// Relative luminance and contrast ratio as defined in the WCAG 2.2 glossary (https://www.w3.org/TR/WCAG22/).
const luminance = (rgb: string) => {
  const channels = rgb.match(/[\d.]+/g);
  assert(channels !== null, `not an rgb() colour: ${rgb}`);
  const [r, g, b] = channels.slice(0, 3).map((value) => {
    const c = Number(value) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

const css = (locator: Locator, property: 'fill' | 'backgroundColor') =>
  locator.evaluate((el, prop) => getComputedStyle(el)[prop], property);

for (const [theme, icon] of [['light', 'moon'], ['dark', 'sun']]) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
      await page.goto('/');
    });

    test(`the theme toggle shows the ${icon} with 3:1 against the header`, async ({ page }) => {
      const shown = page.locator('.theme-toggle svg').filter({ visible: true });
      await expect(shown).toHaveClass(new RegExp(`\\b${icon}\\b`));
      const fill = await css(shown, 'fill');
      expect(contrast(fill, await css(page.locator('.header-wrapper header'), 'backgroundColor'))).toBeGreaterThanOrEqual(3);
    });

    test('the open menu close button has 3:1 against the overlay', async ({ page }) => {
      await page.getByRole('button', { name: 'Open menu' }).click();
      await expect(page.getByRole('button', { name: 'Close menu' })).toBeVisible();
      // The bars transition their colour on open; a mid-transition read could pass falsely.
      await page.evaluate(async () => {
        await Promise.all(document.getAnimations().map((animation) => animation.finished));
      });
      const bar = await css(page.getByRole('button', { name: 'Close menu' }).locator('span').first(), 'backgroundColor');
      expect(contrast(bar, await css(page.locator('.navigator-menu-overlay'), 'backgroundColor'))).toBeGreaterThanOrEqual(3);
    });
  });
}
