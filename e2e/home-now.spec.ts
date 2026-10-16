import { test, expect } from '@playwright/test';

// #218: the now block on the built home page, from src/content/now/now.md. Vitest has no collection data
// (see e2e/cv-experience.spec.ts), so the real text is checked here. Markdown renders typographic quotes.
test.use({ reducedMotion: 'reduce' });

test('shows what Patrik works on now with its updated date', async ({ page }) => {
  await page.goto('/');
  const now = page.getByRole('region', { name: 'Now' });
  await expect(now.getByRole('heading', { level: 2, name: 'Now' })).toBeVisible();
  await expect(now.getByRole('listitem')).toHaveText([
    'Working on my indie game in Godot with GDScript.',
    'Writing blog articles for this site by hand, in Markdown, without AI-generated text.',
    'Visiting car meets and Swiss mountain passes with my RS3.',
  ]);
  const updated = now.locator('time');
  await expect(updated).toHaveAttribute('datetime', '2026-10-16');
  await expect(updated).toHaveText('16 October 2026');
  await expect(now).toContainText('Updated 16 October 2026');
});

// #258: the now card sits near the top, the principles between Work and the writing. Astro renders a component's
// processed <script> in place, so the photo row's drag script (#279) is a child of main and is skipped.
test('sits after the hero, with the principles after the work rows', async ({ page }) => {
  await page.goto('/');
  const ids = await page.locator('main > :not(script)').evaluateAll((blocks) => blocks.map((block) => block.id));
  expect(ids).toEqual(['hero', 'photos', 'get-to-know', 'now', 'services', 'work', 'principles', 'writing', 'faq', 'contact']);
});
