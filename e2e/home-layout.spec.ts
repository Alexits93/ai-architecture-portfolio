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
      // The service cards stick on purpose (#256); the reading column does not.
      const sticky = await page.locator('main > .home *').evaluateAll((elements) =>
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

// Home shows the role as the hero's first kicker (#254); /cv/ keeps it as the AboutMe h2.
test('home and /cv/ show the same site-wide title', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#hero .kicker').first()).toHaveText(SITE.role);
  await expect(page.locator('#hero .kicker').first()).toBeVisible();
  await page.goto('/cv/');
  await expect(page.getByRole('heading', { level: 2, name: SITE.role })).toBeVisible();
});

// The placeholder portrait has a fixed size, so nothing moves while the page loads (#254). Chromium is the only
// engine that reports layout-shift entries (https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift).
for (const width of [320, 1280]) {
  test.describe(`at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('the home hero causes no layout shift', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'layout-shift entries exist only in Chromium');
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      const shift = await page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            new PerformanceObserver((list) => {
              // TypeScript's DOM types have no LayoutShift, so the value is read through an in-check.
              const values = list.getEntries().map((entry) => ('value' in entry && typeof entry.value === 'number' ? entry.value : 0));
              resolve(values.reduce((sum, value) => sum + value, 0));
            }).observe({ type: 'layout-shift', buffered: true });
            setTimeout(() => resolve(0), 500);
          }),
      );
      expect(shift).toBe(0);
    });
  });
}

// From 64rem the name halves sit beside the portrait; each half and its one-line kicker must fit its column, not run
// into the page padding (#254).
for (const width of [1024, 1280, 1440]) {
  test.describe(`hero at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });

    test('the name halves and kickers stay inside the content box of main', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      const { left, right, words } = await page.evaluate(() => {
        const main = document.querySelector('main');
        if (main === null) throw new Error('no main');
        const box = main.getBoundingClientRect();
        const style = getComputedStyle(main);
        return {
          left: box.left + parseFloat(style.paddingLeft),
          right: box.right - parseFloat(style.paddingRight),
          words: [...document.querySelectorAll('#hero .word, #hero .kicker')].map((word) => {
            const range = document.createRange();
            range.selectNodeContents(word);
            const text = range.getBoundingClientRect();
            return { left: text.left, right: text.right };
          }),
        };
      });
      expect(words).toHaveLength(4);
      for (const word of words) {
        expect(word.left).toBeGreaterThanOrEqual(left);
        expect(word.right).toBeLessThanOrEqual(right);
      }
    });
  });
}
