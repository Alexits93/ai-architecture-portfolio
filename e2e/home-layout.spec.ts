import assert from 'node:assert/strict';
import { test, expect } from '@playwright/test';
import { SITE } from '../src/consts';

// #243: one column of about 680 px at every width, no sticky hero (research on #212). Reduced motion keeps the hero
// in its final position, so the boxes do not move while the test measures them.
test.use({ reducedMotion: 'reduce' });

for (const width of [320, 390, 1440]) {
  test.describe(`at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('the blocks stack in one column without sticky parts or horizontal scroll', async ({ page }) => {
      await page.goto('/');
      const column = await page.locator('main > .home').boundingBox();
      assert(column !== null);
      expect(column.width).toBeLessThanOrEqual(680);
      const blocks = await page.locator('main > .home > *').evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();
          return { left: box.left, top: box.top, bottom: box.bottom };
        }),
      );
      for (const [index, block] of blocks.entries()) {
        expect(block.left).toBeCloseTo(column.x, 0);
        const previous = blocks[index - 1];
        if (previous !== undefined) expect(block.top).toBeGreaterThanOrEqual(previous.bottom);
      }
      const sticky = await page.locator('main *').evaluateAll((elements) =>
        elements.filter((element) => getComputedStyle(element).position === 'sticky').length,
      );
      expect(sticky).toBe(0);
      // Read the numbers inside the callback: evaluate serializes a returned DOM node to a string.
      // scrollWidth can be below clientWidth where a stable scrollbar gutter narrows the content box.
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
  });
}

// BlogPostRecommended sizes three columns for a full-width page; in the home column two cards fill the width.
test.describe('at 1440 px', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the recommended cards fill the column in two columns', async ({ page }) => {
    await page.goto('/');
    const column = await page.locator('main > .home').boundingBox();
    const cards = page.locator('#blog-section .wrapper > .blog-post-thumbnail');
    const first = await cards.nth(0).boundingBox();
    const second = await cards.nth(1).boundingBox();
    assert(column !== null && first !== null && second !== null);
    expect(first.width + second.width).toBeGreaterThan(column.width * 0.9);
  });
});

test('home and /cv/ show the same site-wide title', async ({ page }) => {
  for (const path of ['/', '/cv/']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 2, name: SITE.role })).toBeVisible();
  }
});
