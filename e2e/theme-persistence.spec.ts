import { test, expect } from '@playwright/test';

test.use({ colorScheme: 'light' });

test('Theme preference is preserved across page navigations', async ({ page }) => {
  await page.goto('/');

  // No stored choice: the light OS scheme applies without data-theme.
  const html = page.locator('html');
  await expect(html).not.toHaveAttribute('data-theme');

  await page.locator('.theme-toggle').click();
  await expect(html).toHaveAttribute('data-theme', 'dark');

  await page.goto('/cookie-disclaimer/');
  await expect(html).toHaveAttribute('data-theme', 'dark');
});
