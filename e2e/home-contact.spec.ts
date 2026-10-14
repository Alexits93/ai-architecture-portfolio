import { test, expect } from '@playwright/test';
import { SITE } from '../src/consts';

// #260: the end of home. The links carry the meaning and take the keyboard in order; the giant word is decoration that
// runs off the right edge; e2e/home-layout.spec.ts checks that it adds no horizontal scroll.
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

for (const width of [320, 1280, 1920]) {
  test.describe(`at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });

    test('the giant word runs past the right edge of main', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      const { word, main } = await page.evaluate(() => {
        const giant = document.querySelector('#contact .giant');
        const element = document.querySelector('main');
        if (giant === null || element === null) throw new Error('no giant word or main');
        const range = document.createRange();
        range.selectNodeContents(giant);
        return {
          word: range.getBoundingClientRect().right,
          main: element.getBoundingClientRect().right,
        };
      });
      expect(word).toBeGreaterThan(main);
    });
  });
}
