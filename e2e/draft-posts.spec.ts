import { test, expect, type Locator } from '@playwright/test';
import { readPostDates } from '../src/lib/sitemap-lastmod';

// test articles carry `draft: true` until the owner's own posts replace them. Vitest has no content store, so
// the real posts are checked here: each draft shows a Draft label wherever it is listed and on its page, and home and
// /blog/ show the notice while a draft exists.
const posts = readPostDates('src/content/blog').map(({ id, draft }) => ({ href: `/blog/${id}/`, draft }));
const drafts = new Set(posts.filter((post) => post.draft).map((post) => post.href));

// Each item's post link and whether it shows a Draft label.
const labelled = (items: Locator) =>
  items.evaluateAll((elements) =>
    elements.map((el) => {
      const anchor = el.querySelector('a');
      if (anchor === null) throw new Error('no post link');
      return [anchor.getAttribute('href'), el.querySelector('.draft-label') !== null] as const;
    }),
  );

test('home labels exactly the draft posts and shows the notice while one is listed', async ({ page }) => {
  await page.goto('/');
  const rows = await labelled(page.locator('#writing li'));
  expect(rows.length).toBeGreaterThan(0);
  for (const [href, label] of rows) expect(label).toBe(drafts.has(String(href)));
  await expect(page.locator('#writing .draft-notice')).toHaveCount(rows.some(([, label]) => label) ? 1 : 0);
});

test('/blog/ labels exactly the draft posts and shows the notice while one is listed', async ({ page }) => {
  await page.goto('/blog/');
  const cards = await labelled(page.locator('.blog-grid .blog-post-wrapper'));
  expect(cards.length).toBeGreaterThan(0);
  for (const [href, label] of cards) expect(label).toBe(drafts.has(String(href)));
  await expect(page.locator('.draft-notice')).toHaveCount(cards.some(([, label]) => label) ? 1 : 0);
});

for (const { href, draft } of posts) {
  test(`${href} shows a Draft label only if it is a draft`, async ({ page }) => {
    await page.goto(href);
    await expect(page.locator('#post-hero .draft-label')).toHaveCount(draft ? 1 : 0);
  });
}
