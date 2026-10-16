import { test, expect } from '@playwright/test';
import { SITE } from '../src/consts';

// revDSG Art. 19(2)(a) needs the controller's identity and contact details; the policy once gave a wrong address.
test('the privacy policy names the controller and links the site email', async ({ page }) => {
  await page.goto('/privacy-policy/');
  await expect(page.locator('main')).toContainText(`${SITE.name} is responsible`);
  const mailto = page.locator('main a[href^="mailto:"]');
  await expect(mailto.first()).toHaveText(SITE.email);
  for (const link of await mailto.all()) await expect(link).toHaveAttribute('href', `mailto:${SITE.email}`);
  await expect(page.locator('main')).not.toContainText(/gmail/i);
});

// Regression: the section headings rendered at body size, so the page read as one block.
for (const width of [320, 1440]) {
  test.describe(`at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('the privacy policy section headings are larger than the body text', async ({ page }) => {
      await page.goto('/privacy-policy/');
      const size = (selector: string) =>
        page.locator(selector).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(await size('main h2')).toBeGreaterThan(await size('main p'));
    });
  });
}

test('the cookie disclaimer links the privacy policy', async ({ page }) => {
  await page.goto('/cookie-disclaimer/');
  await expect(page.locator('main').getByRole('link', { name: /Privacy Policy/ })).toHaveAttribute('href', '/privacy-policy/');
});
