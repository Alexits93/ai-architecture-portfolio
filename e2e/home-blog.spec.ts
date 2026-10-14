import { globSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// #226, #219: the home writing list links to the real built posts. The Vitest home spec renders fixtures, because
// Vitest has no collection data; this spec checks src/content/blog on the built site.
const POSTS = globSync('blog/*/index.html', { cwd: 'dist' })
  .map((file) => `/${file.replace(/index\.html$/, '')}`)
  .filter((route) => route !== '/blog/category/');

test('finds the built posts', () => expect(POSTS.length).toBeGreaterThan(1));

test('the writing list links to built posts, each once, newest first, then to /blog/', async ({ page }) => {
  await page.goto('/');
  const rows = page.locator('#writing li');
  const hrefs = await rows.locator('a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  const dates = await rows.locator('time').evaluateAll((times) => times.map((time) => time.getAttribute('datetime')));

  expect(hrefs).toHaveLength(Math.min(POSTS.length, 5));
  for (const href of hrefs) expect(POSTS).toContain(href);
  expect(new Set(hrefs).size).toBe(hrefs.length);
  expect(dates).toEqual(dates.toSorted().reverse());
  await expect(page.locator('#writing').getByRole('link', { name: 'All posts' })).toHaveAttribute('href', '/blog/');
});

// One Tab stop per post title, then the All posts link (#219).
test('Tab reaches each post title once', async ({ page }) => {
  await page.goto('/');
  const links = page.locator('#writing a');
  const count = await links.count();
  await links.first().focus();
  const focused: (string | null)[] = [];
  for (let i = 0; i < count; i += 1) {
    focused.push(await page.evaluate(() => document.activeElement && document.activeElement.textContent));
    await page.keyboard.press('Tab');
  }
  expect(focused).toEqual(await links.allTextContents());
});
