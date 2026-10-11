import assert from 'node:assert/strict';
import { test, expect } from '@playwright/test';

test('CV Page renders correctly', async ({ page }) => {
  const response = await page.goto('/cv/');
  assert(response !== null);
  expect(response.status()).toBe(200);

  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.locator('section#about-me')).toBeVisible();
  await expect(page.locator('.experience-list-container')).toBeVisible();

  const count = await page.locator('.experience-item').count();
  expect(count).toBeGreaterThan(0);

  // The legacy CV PDF download was intentionally removed.
  await expect(page.locator('a[download]')).toHaveCount(0);
});
