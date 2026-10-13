import { test, expect } from '@playwright/test';

// #218: the now block on the built home page, from src/content/now/now.md. Vitest has no collection data
// (see tests/pages/cv-experience.spec.ts), so the real text is checked here. Markdown renders typographic quotes.
test.use({ reducedMotion: 'reduce' });

test('shows what Patrik works on now with its updated date', async ({ page }) => {
  await page.goto('/');
  const now = page.getByRole('region', { name: 'Now' });
  await expect(now.getByRole('heading', { level: 2, name: 'Now' })).toBeVisible();
  await expect(now.getByRole('listitem')).toHaveText([
    'Rebuilding this site’s home page around who I am and what I build.',
    'Tightening the gates that keep LLM coding agents honest in this repo.',
    'Writing about working with LLMs as an architect.',
  ]);
  const updated = now.locator('time');
  await expect(updated).toHaveAttribute('datetime', '2026-10-13');
  await expect(updated).toHaveText('13 October 2026');
  await expect(now).toContainText('Updated 13 October 2026');
});

test('sits in the home blocks before the writing', async ({ page }) => {
  await page.goto('/');
  const ids = await page.locator('.home-blocks > *').evaluateAll((blocks) => blocks.map((block) => block.id));
  expect(ids).toEqual(['now', 'blog-featured', 'blog-section']);
});
