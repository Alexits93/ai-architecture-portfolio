import assert from 'node:assert/strict';
import { animationsSettled } from './animations';
import { test, expect, type Page } from '@playwright/test';

// The site menu opens and closes through invoker commands, without a script (#157). A modal dialog
// without closedby behaves as closerequest: Esc closes it, a click outside the items does not
// (https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog).
const opener = (page: Page) => page.getByRole('button', { name: 'Open menu' });
const closer = (page: Page) => page.getByRole('button', { name: 'Close menu' });
const menu = (page: Page) => page.getByRole('dialog', { name: 'Site navigation' });

// Keyboard open: Safari does not focus a clicked button, so only the keyboard proves the focus return.
const openWithKeyboard = async (page: Page) => {
  await opener(page).focus();
  await page.keyboard.press('Enter');
  await expect(menu(page)).toBeVisible();
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Esc closes the menu and focus returns to the hamburger', async ({ page }) => {
  await openWithKeyboard(page);
  await expect(closer(page)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu(page)).toBeHidden();
  await expect(opener(page)).toBeFocused();
});

test('the close button closes the menu and focus returns to the hamburger', async ({ page }) => {
  await openWithKeyboard(page);
  await page.keyboard.press('Enter');
  await expect(menu(page)).toBeHidden();
  await expect(opener(page)).toBeFocused();
});

// Firefox transitions neither display nor overlay, so the close animation used to run in Chromium only (#206).
test('closing animates the overlay before the menu hides', async ({ page }) => {
  await openWithKeyboard(page);
  await animationsSettled(page);
  await closer(page).click();
  const overlay = page.locator('.navigator-menu-overlay');
  expect(await overlay.evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0);
  await expect(menu(page)).toBeHidden();
  await expect(opener(page)).toBeEnabled();
  await opener(page).click();
  await expect(menu(page)).toBeVisible();
});

// Owner 2026-10-12 (#206): the scroll lock on html stopped body's overflow from reaching the viewport, so body
// became a scroll container and the sticky header jumped out of view while the menu opened
// (https://drafts.csswg.org/css-overflow-3/#overflow-propagation).
test('opening the menu on a scrolled page keeps the header and the scroll position', async ({ page }) => {
  // Instant: html scrolls smoothly, and a scroll still animating would move scrollY after the read.
  await page.evaluate(() => window.scrollTo({ top: 800, behavior: 'instant' }));
  const scrollY = await page.evaluate(() => window.scrollY);
  expect(scrollY).toBeGreaterThan(0);
  await opener(page).click();
  await expect(menu(page)).toBeVisible();
  const header = await page.locator('.header-wrapper').boundingBox();
  assert(header !== null);
  expect(header.y).toBe(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
});

test('a click outside the menu items keeps the menu open', async ({ page }) => {
  await opener(page).click();
  await expect(menu(page)).toBeVisible();
  const size = page.viewportSize();
  assert(size !== null);
  await page.mouse.click(size.width - 5, size.height - 5);
  await expect(menu(page)).toBeVisible();
  await closer(page).click();
  await expect(menu(page)).toBeHidden();
});

for (const viewport of [{ width: 320, height: 640 }, { width: 1280, height: 800 }]) {
  test.describe(`at ${viewport.width} px`, () => {
    test.use({ viewport });

    for (const scrolled of [false, true]) {
      test(`the close button covers the hamburger${scrolled ? ' after scrolling' : ''}`, async ({ page }) => {
        if (scrolled) await page.mouse.wheel(0, 600);
        const hamburger = await opener(page).boundingBox();
        await opener(page).click();
        await expect(menu(page)).toBeVisible();
        const close = await closer(page).boundingBox();
        assert(hamburger !== null && close !== null);
        for (const key of ['x', 'y', 'width', 'height'] as const) {
          expect(Math.abs(close[key] - hamburger[key])).toBeLessThanOrEqual(1);
        }
      });
    }
  });
}

// The sticky header keeps z-index 1, enough to stay above positioned page content (#about-me, the post reader)
// once the old 10000 is gone; the open menu needs none, it sits in the top layer (#157).
for (const route of ['/', '/blog/ai-agent-harness/']) {
  test(`the scrolled header on ${route} stays above the page content`, async ({ page }) => {
    await page.goto(route);
    await page.mouse.wheel(0, 600);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    const box = await opener(page).boundingBox();
    assert(box !== null);
    const onTop = await page.evaluate(
      ([x, y]) => {
        const hit = document.elementFromPoint(x, y);
        return hit !== null && hit.closest('header') !== null;
      },
      [box.x + box.width / 2, box.y + box.height / 2],
    );
    expect(onTop).toBe(true);
  });
}
