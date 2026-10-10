import { test, expect, type Page } from '@playwright/test';

// APG button pattern: the toggle keeps the name "Dark theme" and exposes its state with aria-pressed.
const toggle = (page: Page, pressed: boolean) =>
  page.getByRole('button', { name: 'Dark theme', exact: true, pressed });

const tabTo = async (page: Page, pressed: boolean) => {
  for (let i = 0; i < 10 && !(await toggle(page, pressed).evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('Tab');
  }
  await expect(toggle(page, pressed)).toBeFocused();
};

test.describe('Theme toggle', () => {
  test('switches the theme from the keyboard and announces the pressed state', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await tabTo(page, false);
    await page.keyboard.press('Enter');
    await expect(toggle(page, true)).toBeFocused();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.keyboard.press('Space');
    await expect(toggle(page, false)).toBeFocused();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('restores the pressed state of a stored dark theme', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto('/');
    await expect(toggle(page, true)).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
