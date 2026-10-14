import { test, expect, type Page } from '@playwright/test';

// #256: "What I do best" on the built home page, from src/content/services.yaml. Vitest has no content store, so
// the real entries, the sticky stacking and the scroll-driven settle are checked here.

const settleRuns = (page: Page) =>
  page.locator('#services .card').first().evaluate((card) =>
    card.getAnimations().some((animation) => animation instanceof CSSAnimation && animation.animationName === 'card-settle'),
  );

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });

  test('lists the services in order under the section title', async ({ page }) => {
    await page.goto('/');
    const section = page.getByRole('region', { name: 'What I do best' });
    await expect(section.locator('.card h3')).toHaveText([
      '01. Frontend architecture',
      '02. Harnesses for LLM coding agents',
      '03. Coaching engineers',
    ]);
  });

  // At the end of the stack every card has reached its sticky offset, so each one overlaps the one before it.
  // Without sticky they would sit a screen apart.
  test('the cards pile up while the page scrolls', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const stack = document.querySelector('#services ol');
      if (stack === null) throw new Error('no stack');
      const box = stack.getBoundingClientRect();
      window.scrollTo(0, window.scrollY + box.bottom - window.innerHeight);
    });
    const boxes = await page.locator('#services .card').evaluateAll((cards) =>
      cards.map((card) => {
        const box = card.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom };
      }),
    );
    expect(boxes).toHaveLength(3);
    for (const [index, box] of boxes.entries()) {
      const previous = boxes[index - 1];
      if (previous === undefined) continue;
      expect(box.top).toBeGreaterThan(previous.top);
      expect(box.top).toBeLessThan(previous.bottom);
    }
  });

  test('the cards show without the settle animation', async ({ page }) => {
    await page.goto('/');
    expect(await settleRuns(page)).toBe(false);
  });
});

test.describe('motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('a card settles from a stronger tilt where scroll timelines exist', async ({ page }) => {
    await page.goto('/');
    test.skip(!(await page.evaluate(() => CSS.supports('animation-timeline: view()'))), 'no scroll-driven animations');
    expect(await settleRuns(page)).toBe(true);
  });
});

