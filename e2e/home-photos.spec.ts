import { test, expect, type Page } from '@playwright/test';
import assert from 'node:assert/strict';
import { animationsSettled } from './animations';

// #255: the tilted photo row under the hero. It spans the window, scrolls sideways from the keyboard where it
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
    const row = page.getByRole('region', { name: 'Photos' });
    await row.focus();
    await expect(row).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });
});

const tile = '#photos [role="img"] >> nth=0';
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

// #279: a mouse drags the row sideways; the scrollbar is hidden and the cursor shows that it can be grabbed.
test.describe('mouse drag at 390 px', () => {
  test.use({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });

  test('the row shows no scrollbar and a grab cursor', async ({ page }) => {
    await page.goto('/');
    const row = page.locator('#photos');
    expect(await row.evaluate((el) => Math.round(el.getBoundingClientRect().height) - el.clientHeight)).toBe(0);
    await expect(row).toHaveCSS('cursor', 'grab');
  });

  // 100 px ends between the first two snap positions, nearer the second, so the release has to snap the row on.
  test('a drag scrolls the row and it snaps the second photo to the centre on release', async ({ page }) => {
    await page.goto('/');
    const row = page.locator('#photos');
    await row.scrollIntoViewIfNeeded();
    const box = await row.boundingBox();
    assert(box !== null);
    const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 100, y, { steps: 10 });
    await expect(row).toHaveCSS('cursor', 'grabbing');
    expect(await row.evaluate((el) => el.scrollLeft)).toBe(100);
    await page.mouse.up();
    await expect(row).toHaveCSS('cursor', 'grab');
    const offset = () =>
      row.evaluate((el) => {
        const tile = el.querySelectorAll('[role="img"]')[1].getBoundingClientRect();
        return Math.abs(tile.left + tile.width / 2 - (el.getBoundingClientRect().left + el.clientWidth / 2));
      });
    await expect.poll(offset).toBeLessThan(2);
  });
});

test.describe('where the row fits at 1920 px', () => {
  test.use({ viewport: { width: 1920, height: 900 }, reducedMotion: 'reduce' });

  test('the cursor stays the default', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#photos')).toHaveCSS('cursor', 'auto');
  });
});
