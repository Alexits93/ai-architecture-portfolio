import { test, expect } from '@playwright/test';
import { SITE } from '../src/consts';

// #260: the end of home. The links carry the meaning and take the keyboard in order; the giant word is decoration that
// fills the column (#278).
test('Tab walks the email and the social links in order', async ({ page }) => {
  await page.goto('/');
  const section = page.getByRole('region', { name: 'Contact' });
  const names = [SITE.email, 'GitHub', 'LinkedIn', 'Stack Overflow', 'Instagram'];
  await section.getByRole('link', { name: names[0] }).focus();
  for (const name of names) {
    await expect(section.getByRole('link', { name })).toBeFocused();
    await page.keyboard.press('Tab');
  }
  await expect(section.getByText('Say hello')).toBeVisible();
  await expect(section.getByRole('link')).toHaveCount(names.length);
});

// #220: the email links hand off to the mail app. The CSP allows no form or frame and default-src 'self', so a click on
// either mailto: link must raise no violation and leave the page where it is.
test('the contact and footer email links open mailto: without a CSP violation', async ({ page }) => {
  await page.addInitScript(() => {
    window.addEventListener('securitypolicyviolation', (event) => {
      document.documentElement.dataset.cspViolation = `${event.effectiveDirective} blocked ${event.blockedURI}`;
    });
  });
  await page.goto('/');
  const links = [
    page.getByRole('region', { name: 'Contact' }).getByRole('link', { name: SITE.email }),
    page.getByRole('contentinfo').getByRole('link', { name: SITE.email }),
  ];
  for (const link of links) {
    await expect(link).toHaveAttribute('href', `mailto:${SITE.email}`);
    await link.click();
    // Two frames give a violation from the click time to be reported.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(page).toHaveURL('/');
    await expect(page.locator('html')).not.toHaveAttribute('data-csp-violation');
  }
});

for (const width of [320, 390, 1440, 1920]) {
  test.describe(`at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });

    // #278: the word read as overflow where it ran off the edge, so it now fills the column, uncut.
    test('the giant word fills the contact column without leaving it', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      const { word, column } = await page.locator('#contact .giant').evaluate((giant) => {
        const range = document.createRange();
        range.selectNodeContents(giant);
        const text = range.getBoundingClientRect();
        const box = giant.getBoundingClientRect();
        return { word: { left: text.left, right: text.right }, column: { left: box.left, right: box.right } };
      });
      expect(word.left).toBeGreaterThanOrEqual(column.left);
      expect(word.right).toBeLessThanOrEqual(column.right);
      expect(word.right - word.left).toBeGreaterThan(0.9 * (column.right - column.left));
    });
  });
}
