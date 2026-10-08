import { test, expect } from '@playwright/test';

test('Theme preference is preserved across page navigations', async ({ page }) => {
  // Go to home page
  await page.goto('/');

  // Check initial theme state (assuming light is default)
  const body = page.locator('body');
  await expect(body).toHaveAttribute('data-theme', 'light');

  // Click the theme toggle
  const themeToggle = page.locator('.theme-toggle');
  await themeToggle.click();

  // Verify theme changed to dark
  await expect(body).toHaveAttribute('data-theme', 'dark');

  // Navigate to another page (e.g. Privacy Policy) directly
  await page.goto('/cookie-disclaimer');

  // The theme should STILL be dark
  await expect(body).toHaveAttribute('data-theme', 'dark');
});
