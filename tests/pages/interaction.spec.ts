import { test, expect, type Page } from '@playwright/test';

// Owner 2026-10-12 (#206): interactive elements react to the pointer. Hover styles apply only where the primary
// input can hover (https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover), and focus rings only on
// :focus-visible, so a mouse click draws none (https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible).
const settled = (page: Page) =>
  page.evaluate(async () => {
    await Promise.allSettled(document.getAnimations().map((animation) => animation.finished));
  });

test('a hovered blog card lifts onto a changed surface', async ({ page }) => {
  await page.goto('/blog/');
  const card = page.locator('.blog-post-thumbnail').first();
  const surface = card.locator('article');
  const before = await surface.evaluate((el) => getComputedStyle(el).backgroundColor);
  await card.hover();
  await settled(page);
  const after = await surface.evaluate((el) => {
    const style = getComputedStyle(el);
    return { background: style.backgroundColor, translate: style.translate };
  });
  expect(after.background).not.toBe(before);
  expect(after.translate).not.toBe('none');
});

test('the hovered theme toggle shows a tint behind the icon', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('.theme-toggle');
  await toggle.hover();
  await settled(page);
  expect(await toggle.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
});

test('a mouse click on a link draws no focus outline', async ({ page }) => {
  await page.goto('/blog/');
  const filter = page.getByRole('navigation', { name: 'Blog categories' }).getByRole('link', { name: 'AI' });
  await filter.evaluate((el) => el.addEventListener('click', (event) => event.preventDefault()));
  await filter.click();
  expect(await filter.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none');
});

test('the current blog category is underlined', async ({ page }) => {
  await page.goto('/blog/');
  const current = page.getByRole('navigation', { name: 'Blog categories' }).getByRole('link', { name: 'All' });
  await expect(current).toHaveAttribute('aria-current', 'page');
  const decoration = await current.evaluate((el) => {
    const style = getComputedStyle(el);
    return { line: style.textDecorationLine, color: style.textDecorationColor, text: style.color };
  });
  expect(decoration.line).toBe('underline');
  expect(decoration.color).toBe(decoration.text);
});

for (const theme of ['dark', 'light']) {
  test(`the hovered See all articles button changes its surface in the ${theme} theme`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
    await page.goto('/');
    const button = page.getByRole('link', { name: 'See all articles' });
    const before = await button.evaluate((el) => getComputedStyle(el).backgroundColor);
    await button.hover();
    await settled(page);
    expect(await button.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(before);
  });
}
