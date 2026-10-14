import { test, expect, type Page } from '@playwright/test';
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
