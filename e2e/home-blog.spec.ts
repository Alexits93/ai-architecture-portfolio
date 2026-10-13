import { globSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// #226: the home blog cards link to the real built posts. The Vitest home spec renders fixtures, because Vitest has
// no collection data; this spec checks src/content/blog on the built site.
const POSTS = globSync('blog/*/index.html', { cwd: 'dist' })
  .map((file) => `/${file.replace(/index\.html$/, '')}`)
  .filter((route) => route !== '/blog/category/');

test('finds the built posts', () => expect(POSTS.length).toBeGreaterThan(1));

test('the home cards link to built posts, each once', async ({ page }) => {
  await page.goto('/');
  const hrefs = (selector: string) => page.locator(selector).evaluateAll((cards) => cards.map((card) => card.getAttribute('href')));
  const featured = await hrefs('#blog-featured .blog-post-thumbnail');
  const recommended = await hrefs('#blog-section .blog-post-thumbnail');

  expect(featured).toHaveLength(1);
  expect(recommended.length).toBeGreaterThan(0);
  for (const href of [...featured, ...recommended]) expect(POSTS).toContain(href);
  expect(new Set([...featured, ...recommended]).size).toBe(featured.length + recommended.length);
});
