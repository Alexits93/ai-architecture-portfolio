import { test, expect } from '@playwright/test';

// The legal pages state that the site sets no cookies and claims no implied consent.
test('the privacy policy says no cookies are set and names a contact', async ({ page }) => {
  await page.goto('/privacy-policy/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy Policy');
  await expect(page.locator('main')).toContainText('This site sets no cookies');
  await expect(page.locator('main')).not.toContainText(/spotify|by accessing the site, you agree/i);
  await expect(page.locator('main')).toContainText('please contact us at');
});

test('the cookie disclaimer explains localStorage and links the privacy policy', async ({ page }) => {
  await page.goto('/cookie-disclaimer/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cookie Disclaimer');
  await expect(page.locator('main')).toContainText('This site sets no cookies');
  await expect(page.locator('main')).toContainText('localStorage');
  await expect(page.locator('main')).not.toContainText(/spotify|by continuing/i);
  await expect(page.locator('main').getByRole('link', { name: /Privacy Policy/ })).toHaveAttribute('href', '/privacy-policy/');
});
