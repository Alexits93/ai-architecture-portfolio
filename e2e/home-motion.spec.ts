import { test, expect, type Page } from '@playwright/test';
import { animationsSettled } from './animations';

// Story #209, Task #210: motion on the home page that shows frontend craft, and none under reduced motion.

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

// Home shows no social icons in the hero; they sit in the Connect line (#243).
const HERO = ['.about-me h1', '.about-me h2', '.about-me h3', '.about-me p'];

test.describe('motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the hero parts enter one after another and end fully visible', async ({ page }) => {
    await page.goto('/');
    for (const selector of HERO) expect(await cssAnimations(page, selector)).toContain('hero-enter');
    const delays: number[] = [];
    for (const selector of HERO) {
      delays.push(await page.locator(selector).first().evaluate((el) => parseFloat(getComputedStyle(el).animationDelay)));
    }
    expect(delays).toEqual([...delays].sort((a, b) => a - b));
    expect(new Set(delays).size).toBe(HERO.length);
    await animationsSettled(page);
    for (const selector of HERO) await expect(page.locator(selector).first()).toHaveCSS('opacity', '1');
  });

  test('the name carries a moving gradient accent', async ({ page }) => {
    await page.goto('/');
    expect(await cssAnimations(page, '.about-me h1')).toContain('name-gradient');
  });

  test('the theme toggle reveals the new theme as a view transition', async ({ page }) => {
    await page.goto('/');
    await animationsSettled(page);
    const before = await background(page);
    await page.locator('.theme-toggle').click();
    await expect.poll(() => rootRevealRuns(page)).toBe(true);
    await expect.poll(() => background(page)).not.toBe(before);
  });

  test('recommended cards reveal with the scroll where scroll timelines exist', async ({ page }) => {
    await page.goto('/');
    test.skip(!(await page.evaluate(() => CSS.supports('animation-timeline: view()'))), 'no scroll-driven animations');
    expect(await cssAnimations(page, '#blog-section .blog-post-thumbnail')).toContain('card-reveal');
  });
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

  test('recommended cards do not reveal with the scroll', async ({ page }) => {
    await page.goto('/');
    expect(await cssAnimations(page, '#blog-section .blog-post-thumbnail')).toEqual([]);
  });
});
