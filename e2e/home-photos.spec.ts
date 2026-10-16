import { test, expect, type Page } from '@playwright/test';
import assert from 'node:assert/strict';
import { animationsSettled } from './animations';

// the tilted photo row under the hero. It spans the window, scrolls sideways from the keyboard where it
// overflows, and a photo straightens on hover only where motion is allowed.

test.describe('at 320 px', () => {
  test.use({ viewport: { width: 320, height: 900 }, reducedMotion: 'reduce' });

  test('the row reaches both window edges', async ({ page }) => {
    await page.goto('/');
    // The root box ends where a classic scrollbar starts; 50vw counts the scrollbar, so the row overshoots it.
    const { left, right, pageRight } = await page.locator('#photos').evaluate((row) => ({
      left: row.getBoundingClientRect().left,
      right: row.getBoundingClientRect().right,
      pageRight: document.documentElement.getBoundingClientRect().right,
    }));
    expect(left).toBeLessThanOrEqual(0);
    expect(right).toBeGreaterThanOrEqual(pageRight);
  });

  test('keyboard users can focus the row and scroll it with the arrow keys', async ({ page }) => {
    await page.goto('/');
    const row = page.getByRole('group', { name: 'Photos' });
    await row.focus();
    await expect(row).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });
});

const tile = '#photos .open img >> nth=0';
const rotate = (page: Page) => page.locator(tile).evaluate((el) => getComputedStyle(el).rotate);

test.describe('motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('a photo straightens on hover', async ({ page }) => {
    await page.goto('/');
    await animationsSettled(page);
    expect(await rotate(page)).not.toBe('0deg');
    await page.locator(tile).hover();
    await expect.poll(() => rotate(page)).toBe('0deg');
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('a photo keeps its tilt on hover', async ({ page }) => {
    await page.goto('/');
    const before = await rotate(page);
    expect(before).not.toBe('0deg');
    await page.locator(tile).hover();
    expect(await rotate(page)).toBe(before);
  });
});

// How far the centre of photo `index` sits from the centre of the row, in px.
const offCentre = (page: Page, index: number) =>
  page.locator('#photos').evaluate((row, i) => {
    const tile = row.querySelectorAll('.open img')[i].getBoundingClientRect();
    return Math.abs(tile.left + tile.width / 2 - (row.getBoundingClientRect().left + row.clientWidth / 2));
  }, index);

// the row starts at its middle, so both outer photos sit partly off screen.
for (const width of [390, 1440]) {
  test.describe(`at ${width} px with motion reduced`, () => {
    test.use({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });

    test('the row starts with the middle photo centred', async ({ page }) => {
      await page.goto('/');
      await expect.poll(() => offCentre(page, 2)).toBeLessThan(2);
    });
  });
}

// a mouse drags the row sideways; the scrollbar is hidden and the cursor shows that it can be grabbed.
test.describe('mouse drag at 390 px', () => {
  test.use({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });

  test('the row shows no scrollbar and a grab cursor', async ({ page }) => {
    await page.goto('/');
    const row = page.locator('#photos');
    expect(await row.evaluate((el) => Math.round(el.getBoundingClientRect().height) - el.clientHeight)).toBe(0);
    await expect(row).toHaveCSS('cursor', 'grab');
  });

  // Photos sit 216 px apart at this width; 130 px from the middle one ends nearer the fourth, so the release has to
  // snap the row on.
  test('a drag scrolls the row and it snaps the next photo to the centre on release', async ({ page }) => {
    await page.goto('/');
    const row = page.locator('#photos');
    await row.scrollIntoViewIfNeeded();
    await expect.poll(() => offCentre(page, 2)).toBeLessThan(2);
    const start = await row.evaluate((el) => el.scrollLeft);
    const box = await row.boundingBox();
    assert(box !== null);
    const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 130, y, { steps: 10 });
    await expect(row).toHaveCSS('cursor', 'grabbing');
    expect(await row.evaluate((el) => el.scrollLeft)).toBe(start + 130);
    await page.mouse.up();
    await expect(row).toHaveCSS('cursor', 'grab');
    await expect.poll(() => offCentre(page, 3)).toBeLessThan(2);
  });
});

test.describe('where the row fits at 1920 px', () => {
  test.use({ viewport: { width: 1920, height: 900 }, reducedMotion: 'reduce' });

  test('the cursor stays the default', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#photos')).toHaveCSS('cursor', 'auto');
  });
});
