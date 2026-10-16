import { test, expect, type Page } from '@playwright/test';
import { animationsSettled } from './animations';

// Motion on the home page, and none under reduced motion (WCAG 2.3.3).

const background = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

// Names of the CSS animations running on an element, read through the Web Animations API.
const cssAnimations = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) =>
    el.getAnimations().flatMap((animation) => (animation instanceof CSSAnimation ? [animation.animationName] : [])),
  );

// True once an animation runs on the new root snapshot of a view transition.
const rootRevealRuns = (page: Page) =>
  page.evaluate(() =>
    document.getAnimations().some((animation) => {
      const effect = animation.effect;
      return effect instanceof KeyframeEffect && effect.pseudoElement === '::view-transition-new(root)';
    }),
  );

// A post page, which renders the recommended cards.
const POST = '/blog/ai-agent-harness/';

// The visible hero parts in reading order: the name halves with their kickers around the portrait, then the
// pitch. The h1 is visually hidden and does not move.
const HERO = ['#hero .hero-side >> nth=0', '#hero .portrait', '#hero .hero-side >> nth=1', '#hero .pitch'];

test.describe('motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the hero parts enter and end fully visible', async ({ page }) => {
    await page.goto('/');
    for (const selector of HERO) expect(await cssAnimations(page, selector)).toContain('hero-enter');
    await animationsSettled(page);
    for (const selector of HERO) await expect(page.locator(selector).first()).toHaveCSS('opacity', '1');
  });

  test('both name halves carry a moving gradient accent', async ({ page }) => {
    await page.goto('/');
    for (const word of ['#hero .word >> nth=0', '#hero .word >> nth=1']) {
      expect(await cssAnimations(page, word)).toContain('name-gradient');
    }
  });

  test('the theme toggle reveals the new theme as a view transition', async ({ page }) => {
    await page.goto('/');
    await animationsSettled(page);
    const before = await background(page);
    await page.locator('.theme-toggle').click();
    await expect.poll(() => rootRevealRuns(page)).toBe(true);
    await expect.poll(() => background(page)).not.toBe(before);
  });

  // The recommended cards render only on the post pages.
  test('recommended cards on a post reveal with the scroll where scroll timelines exist', async ({ page }) => {
    await page.goto(POST);
    test.skip(!(await page.evaluate(() => CSS.supports('animation-timeline: view()'))), 'no scroll-driven animations');
    expect(await cssAnimations(page, '#blog-section .blog-post-thumbnail')).toContain('card-reveal');
  });
});

test.describe('motion allowed, page metrics', () => {
  test.use({ reducedMotion: 'no-preference' });

  // Regression: the entrance started every hero part at opacity 0, which Chrome does not count as contentful, so the
  // page had no Largest Contentful Paint (https://web.dev/articles/lcp#what-elements-are-considered). Only Chromium
  // reports it. /cv/ runs the same entrance.
  for (const path of ['/', '/cv/']) {
    test(`${path} records a Largest Contentful Paint while the hero enters`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'largest-contentful-paint entries exist only in Chromium');
      await page.goto(path);
      await animationsSettled(page);
      const entries = await page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            new PerformanceObserver((list) => resolve(list.getEntries().length)).observe({ type: 'largest-contentful-paint', buffered: true });
            setTimeout(() => resolve(0), 500);
          }),
      );
      expect(entries).toBeGreaterThan(0);
    });
  }
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the hero shows at once and the name gradient stands still', async ({ page }) => {
    await page.goto('/');
    for (const selector of HERO) expect(await cssAnimations(page, selector)).toEqual([]);
    for (const selector of HERO) await expect(page.locator(selector).first()).toHaveCSS('opacity', '1');
  });

  test('the theme toggle switches without a view transition', async ({ page }) => {
    await page.goto('/');
    const before = await background(page);
    await page.locator('.theme-toggle').click();
    expect(await rootRevealRuns(page)).toBe(false);
    await expect.poll(() => background(page)).not.toBe(before);
  });

  test('recommended cards on a post do not reveal with the scroll', async ({ page }) => {
    await page.goto(POST);
    expect(await cssAnimations(page, '#blog-section .blog-post-thumbnail')).toEqual([]);
  });

  test('the portrait does not tilt under the pointer', async ({ page }) => {
    await page.goto('/');
    await hoverPortrait(page, 0.1, 0.1);
    await expect(page.locator(FACE)).toHaveCSS('transform', 'none');
  });
});

// The portrait tilts in 3D towards the pointer with a glare that follows it, as Steam's cards do. The face tilts
// and the untilted card around it takes the pointer, so the hit area stays still.
const FACE = '#hero .portrait-face';
const hoverPortrait = async (page: Page, x: number, y: number) => {
  await animationsSettled(page);
  const box = await page.locator('#hero .portrait').boundingBox();
  if (box === null) throw new Error('no portrait');
  await page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps: 4 });
};
const tilt = (page: Page) =>
  page.locator('#hero .portrait').evaluate((card) => {
    const style = getComputedStyle(card);
    return [style.getPropertyValue('--tilt-x'), style.getPropertyValue('--tilt-y'), style.getPropertyValue('--glare')].map(parseFloat);
  });

test.describe('portrait tilt', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('tilts the portrait towards the pointer with a glare, and settles when the pointer leaves', async ({ page }) => {
    await page.goto('/');
    await hoverPortrait(page, 0.1, 0.1);
    // Top left: the top edge and the left edge move back.
    const [x, y, glare] = await tilt(page);
    expect(x).toBeGreaterThan(0);
    expect(y).toBeLessThan(0);
    expect(glare).toBe(1);
    await expect(page.locator(FACE)).not.toHaveCSS('transform', 'none');
    await page.mouse.move(0, 0);
    await expect.poll(() => tilt(page)).toEqual([0, 0, 0]);
  });
});
