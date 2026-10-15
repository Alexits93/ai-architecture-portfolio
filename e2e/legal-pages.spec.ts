import { test, expect } from '@playwright/test';
import { SITE } from '../src/consts';

// The legal pages state that the site sets no cookies and claims no implied consent.
test('the privacy policy says no cookies are set and names a contact', async ({ page }) => {
  await page.goto('/privacy-policy/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy Policy');
  await expect(page.locator('main')).toContainText('This site sets no cookies');
  await expect(page.locator('main')).not.toContainText(/spotify|by accessing the site, you agree/i);
});

// revDSG Art. 19(2)(a) needs the controller's identity and contact details; the policy gave a wrong address (#297).
test('the privacy policy names the controller and links the site email', async ({ page }) => {
  await page.goto('/privacy-policy/');
  await expect(page.locator('main')).toContainText(`${SITE.name} is responsible`);
  const mailto = page.locator('main a[href^="mailto:"]');
  await expect(mailto.first()).toHaveText(SITE.email);
  for (const link of await mailto.all()) await expect(link).toHaveAttribute('href', `mailto:${SITE.email}`);
  await expect(page.locator('main')).not.toContainText(/gmail/i);
});

// The section headings rendered at body size with no spacing, so the page read as one block (#297).
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

test('the cookie disclaimer explains localStorage and links the privacy policy', async ({ page }) => {
  await page.goto('/cookie-disclaimer/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cookie Disclaimer');
  await expect(page.locator('main')).toContainText('This site sets no cookies');
  await expect(page.locator('main')).toContainText('localStorage');
  await expect(page.locator('main')).not.toContainText(/spotify|by continuing/i);
  await expect(page.locator('main').getByRole('link', { name: /Privacy Policy/ })).toHaveAttribute('href', '/privacy-policy/');
});

// The legal pages take the home design system (#302): a Legal eyebrow over a display h1.
for (const [path, title] of [['/privacy-policy/', 'Privacy Policy'], ['/cookie-disclaimer/', 'Cookie Disclaimer']]) {
  test(`${path} shows the Legal eyebrow over a display h1`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('main .eyebrow')).toHaveText('/ Legal');
    await expect(page.locator('main h1.display[data-size="section"]')).toHaveText(title);
  });
}
