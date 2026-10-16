import { test, expect } from '@playwright/test';

// Back after a menu link restores the previous page from the back/forward cache, and the menu must come back
// closed. Runs only in the chromium-bfcache project: Playwright's default Chromium disables the cache.
// A restore fires pageshow with persisted and no load event (https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event).
test('Back after a menu link restores the page from the cache with the menu closed, 10 times', async ({ page }) => {
  for (let run = 0; run < 10; run++) {
    await page.goto('/');
    await page.evaluate(() => {
      addEventListener('pageshow', (event) => { document.body.dataset.restored = String(event.persisted); });
    });
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('dialog', { name: 'Site navigation' }).getByRole('link', { name: 'Blog' }).click();
    await expect(page).toHaveURL(/\/blog\/$/);
    await page.goBack({ waitUntil: 'commit' });
    await expect(page.locator('body')).toHaveAttribute('data-restored', 'true');
    await expect(page.getByRole('dialog', { name: 'Site navigation' })).toBeHidden();
  }
});
