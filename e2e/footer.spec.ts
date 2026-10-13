import { globSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

// BaseLayout renders the footer once on every built page (#132).
const ROUTES = globSync('**/*.html', { cwd: 'dist' }).map((file) => `/${file.replace(/index\.html$/, '')}`);

test('finds the built pages', () => expect(ROUTES.length).toBeGreaterThan(5));

for (const route of ROUTES) {
  test(`one footer after main on ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('footer')).toHaveCount(1);
    await expect(page.getByRole('contentinfo')).toBeVisible();
    await expect(page.locator('main + footer')).toHaveCount(1);
    await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Cookie disclaimer' })).toHaveAttribute('href', '/cookie-disclaimer/');
    await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy-policy/');
  });
}

// compressHTML removes the whitespace between the policy links, so the gap has to come from CSS.
const linkGap = async (page: Page) => {
  const footer = page.getByRole('contentinfo');
  const cookie = await footer.getByRole('link', { name: 'Cookie disclaimer' }).boundingBox();
  const privacy = await footer.getByRole('link', { name: 'Privacy policy' }).boundingBox();
  if (!cookie || !privacy) throw new Error('footer links are not rendered');
  const horizontal = Math.max(privacy.x - (cookie.x + cookie.width), cookie.x - (privacy.x + privacy.width));
  const vertical = Math.max(privacy.y - (cookie.y + cookie.height), cookie.y - (privacy.y + privacy.height));
  return Math.max(horizontal, vertical);
};

for (const width of [1280, 320]) {
  test(`policy links do not touch at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    expect(await linkGap(page)).toBeGreaterThanOrEqual(8);
  });
}
