import { test, expect, type Page } from '@playwright/test';

// #259: the FAQ on the built home page, from src/content/faq.yaml. Vitest has no content store and does not run the
// browser's exclusive accordion, so the real entries, the one-open-at-a-time rule and the motion are checked here.

// Clicks the first question and, in the same task, reads the answer's ::details-content box and the plus sign's
// transition. Neither engine lists ::details-content transitions in getAnimations(), and Firefox reports the end value
// in getComputedStyle while it fades, so the declared transition stands in for the motion
// (https://developer.mozilla.org/en-US/docs/Web/CSS/::details-content).
const openFirst = (page: Page) =>
  page.locator('#faq details').first().evaluate((details) => {
    const summary = details.querySelector('summary');
    if (summary === null) throw new Error('no summary');
    summary.click();
    const content = getComputedStyle(details, '::details-content');
    return {
      opacity: content.opacity,
      contentTransition: content.transitionDuration.split(', ').map(parseFloat),
      plusTransition: parseFloat(getComputedStyle(summary, '::after').transitionDuration),
    };
  });

test('lists the questions in order and opens one at a time', async ({ page }) => {
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Frequently asked' });
  const questions = section.locator('details');
  await expect(section.locator('summary')).toHaveText([
    'What does a frontend architect do?',
    'What is an agent harness?',
    'Which stack do you use?',
    'How do you work with LLMs?',
  ]);

  await questions.nth(0).locator('summary').click();
  await expect(questions.nth(0)).toHaveAttribute('open');
  await questions.nth(1).locator('summary').click();
  await expect(questions.nth(1)).toHaveAttribute('open');
  await expect(questions.nth(0)).not.toHaveAttribute('open');
});

test('every question is reachable with Tab and toggles with Enter and Space', async ({ page }) => {
  await page.goto('/');
  const summaries = page.locator('#faq summary');
  const questions = page.locator('#faq details');
  const count = await summaries.count();

  await summaries.first().focus();
  for (let i = 0; i < count; i++) {
    await expect(summaries.nth(i)).toBeFocused();
    await page.keyboard.press(i % 2 === 0 ? 'Enter' : 'Space');
    await expect(questions.nth(i)).toHaveAttribute('open');
    await page.keyboard.press('Enter');
    await expect(questions.nth(i)).not.toHaveAttribute('open');
    await page.keyboard.press('Tab');
  }
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('an answer opens without a transition', async ({ page }) => {
    await page.goto('/');
    const opened = await openFirst(page);
    expect(opened.opacity).toBe('1');
    expect(opened.contentTransition).toEqual([0]);
    // The global reset in src/styles/global.css shortens every transition to 0.01ms.
    expect(opened.plusTransition).toBeLessThan(0.001);
    await expect(page.locator('#faq details').first().locator('p')).toBeVisible();
  });
});

test.describe('motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('an answer fades in where ::details-content exists', async ({ page }) => {
    await page.goto('/');
    test.skip(!(await page.evaluate(() => CSS.supports('selector(::details-content)'))), 'no ::details-content');
    const opened = await openFirst(page);
    expect(opened.contentTransition).toEqual([0.4, 0.4, 0.4]);
    expect(opened.plusTransition).toBe(0.3);
  });
});
