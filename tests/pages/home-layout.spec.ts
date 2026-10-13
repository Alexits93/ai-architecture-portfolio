import assert from 'node:assert/strict';
import { test, expect } from '@playwright/test';
import { SITE } from '../../src/shared/config/site';

// Task #214: the hero stays in view beside the scrolling blocks from 64rem, and stacks above them below that.
// Reduced motion keeps the hero in its final position, so the boxes do not move while the test measures them.
test.use({ reducedMotion: 'reduce' });

test.describe('at 1440 px', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the hero column stays in view while the blocks scroll', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('section#about-me');
    const blocks = page.locator('.home-blocks');
    const heroBox = await hero.boundingBox();
    const blocksBox = await blocks.boundingBox();
    assert(heroBox !== null && blocksBox !== null);
    expect(blocksBox.x).toBeGreaterThanOrEqual(heroBox.x + heroBox.width);
    expect(blocksBox.height).toBeGreaterThan(900);

    await page.mouse.wheel(0, 600);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(600);
    const scrolledHero = await hero.boundingBox();
    const scrolledBlocks = await blocks.boundingBox();
    assert(scrolledHero !== null && scrolledBlocks !== null);
    expect(scrolledBlocks.y).toBeCloseTo(blocksBox.y - 600, 0);
    expect(scrolledHero.y).toBeGreaterThanOrEqual(0);
    expect(scrolledHero.y + scrolledHero.height).toBeLessThanOrEqual(900);
  });

  test('the blog widgets fill the right column from its left edge', async ({ page }) => {
    await page.goto('/');
    const blocksBox = await page.locator('.home-blocks').boundingBox();
    const featuredBox = await page.locator('#blog-featured .wrapper > *').first().boundingBox();
    const cards = page.locator('#blog-section .wrapper > .blog-post-thumbnail');
    const first = await cards.nth(0).boundingBox();
    const second = await cards.nth(1).boundingBox();
    assert(blocksBox !== null && featuredBox !== null && first !== null && second !== null);
    expect(featuredBox.x).toBeCloseTo(blocksBox.x, 0);
    // Two cards share the column width, not three.
    expect(first.width + second.width).toBeGreaterThan(blocksBox.width * 0.9);
  });
});

test.describe('at 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the hero comes first in one column without horizontal scroll', async ({ page }) => {
    await page.goto('/');
    const heroBox = await page.locator('section#about-me').boundingBox();
    const blocksBox = await page.locator('.home-blocks').boundingBox();
    assert(heroBox !== null && blocksBox !== null);
    expect(blocksBox.y).toBeGreaterThanOrEqual(heroBox.y + heroBox.height);
    expect(blocksBox.x).toBeCloseTo(heroBox.x, 0);
    // clientWidth excludes a classic scrollbar, so the comparison holds in every engine.
    const { scrollWidth, clientWidth } = await page.evaluate(() => document.documentElement);
    expect(scrollWidth).toBe(clientWidth);
  });
});

test('home and /cv/ show the same site-wide title', async ({ page }) => {
  for (const path of ['/', '/cv/']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 2, name: SITE.role })).toBeVisible();
  }
});
