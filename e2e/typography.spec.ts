import { globSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// One h1 on home, post h2 above body text, Inter from the Fonts API only (#232).
const POST_ROUTE = `/${globSync('blog/*/index.html', { cwd: 'dist' })[0].replace(/index\.html$/, '')}`;

test('home has exactly one h1', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
});

test('a post h2 is larger than its body text', async ({ page }) => {
  await page.goto(POST_ROUTE);
  const size = (selector: string) =>
    page.locator(selector).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(await size('.prose h2')).toBeGreaterThan(await size('.prose p'));
});

test('Inter loads through the Fonts API, not @fontsource', async ({ page }) => {
  const fonts: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'font') fonts.push(new URL(request.url()).pathname);
  });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  expect(fonts.length).toBeGreaterThan(0);
  for (const font of fonts) expect(font).toMatch(/^\/_astro\/fonts\//);
  expect(await page.content()).not.toContain('fontsource');
});
