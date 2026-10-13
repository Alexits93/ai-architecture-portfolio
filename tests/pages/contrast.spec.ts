import assert from 'node:assert/strict';
import { animationsSettled } from './animations';
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
      await animationsSettled(page);
      const bar = await css(page.getByRole('button', { name: 'Close menu' }).locator('span').first(), 'backgroundColor');
      expect(contrast(bar, await css(page.locator('.navigator-menu-overlay'), 'backgroundColor'))).toBeGreaterThanOrEqual(3);
    });
  });
}

// Owner 2026-10-12 (#206): a card sits on its own surface. In dark the surface is lighter than the page,
// as Material's dark scheme raises containers above the surface tone; in light it is darker.
for (const [theme, raised] of [['dark', true], ['light', false]] as const) {
  test(`blog cards in the ${theme} theme sit on a ${raised ? 'lighter' : 'darker'} surface than the page`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
    await page.goto('/blog/');
    const card = luminance(await css(page.locator('.blog-post-thumbnail article').first(), 'backgroundColor'));
    const body = luminance(await css(page.locator('body'), 'backgroundColor'));
    expect(card > body).toBe(raised);
  });
}

// #210: the name is painted by a gradient between --accent-a and --accent-b; each end keeps 3:1 against the page,
// the WCAG 2.2 SC 1.4.3 minimum for large text (the name is 2.25rem bold).
for (const theme of ['light', 'dark']) {
  test(`the name's gradient accents keep 3:1 against the page in the ${theme} theme`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
    await page.goto('/');
    const resolve = (token: string) =>
      page.evaluate((name) => {
        const probe = document.createElement('span');
        probe.style.color = `var(${name})`;
        document.body.append(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      }, token);
    const body = await css(page.locator('body'), 'backgroundColor');
    for (const token of ['--accent-a', '--accent-b']) {
      expect(contrast(await resolve(token), body), token).toBeGreaterThanOrEqual(3);
    }
  });
}
