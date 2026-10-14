import { test, expect } from '@playwright/test';

// #286: the section eyebrows start with a decorative slash, which NVDA and VoiceOver speak as "slash". It stays on
// screen and is hidden from the accessibility tree.
test('the eyebrows show the slash but keep it out of the accessible text', async ({ page }) => {
  await page.goto('/');
  const eyebrows = page.locator('main .eyebrow').filter({ hasText: /^\// });
  await expect(eyebrows).toHaveCount(6);
  await expect(eyebrows.first()).toHaveText('/ Currently');
  expect(await page.locator('main').ariaSnapshot()).not.toMatch(/paragraph: \//);
});
