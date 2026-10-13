import assert from 'node:assert/strict';
import { test, expect } from '@playwright/test';

// An unknown path gets the site's own 404 page with a way back, not the host's generic page (#154).
test('an unknown path returns 404 with the site page and links home and to the blog', async ({ page }) => {
  const response = await page.goto('/does-not-exist/');
  assert(response !== null);
  expect(response.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  const main = page.locator('main');
  await expect(main.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  await expect(main.getByRole('link', { name: 'Blog' })).toHaveAttribute('href', '/blog/');
  await expect(page.locator('main')).not.toContainText('does-not-exist');
});
