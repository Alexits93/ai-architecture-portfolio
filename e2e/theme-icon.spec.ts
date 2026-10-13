import { test, expect } from '@playwright/test';

// Owner 2026-10-12 (#206): the icon flipped on every navigation, because it followed aria-pressed, which the
// deferred header script sets after first paint. The icon follows data-theme and the OS scheme, known at first paint,
// so it is right even with the module scripts blocked.
for (const { os, storedTheme, icon } of [
  { os: 'light', storedTheme: 'dark', icon: 'sun' },
  { os: 'dark', storedTheme: null, icon: 'sun' },
  { os: 'dark', storedTheme: 'light', icon: 'moon' },
  { os: 'light', storedTheme: null, icon: 'moon' },
] as const) {
  test.describe(`OS ${os}, stored ${storedTheme === null ? 'none' : storedTheme}`, () => {
    test.use({ colorScheme: os });

    test(`the toggle shows the ${icon} before any module script runs`, async ({ page }) => {
      // Astro inlines the header script as a module; drop it from the HTML so only the classic head script runs.
      await page.route('**/', async (route) => {
        const response = await route.fetch();
        const body = (await response.text()).replace(/<script type="module">[\s\S]*?<\/script>/g, '');
        await route.fulfill({ response, body });
      });
      if (storedTheme !== null) await page.addInitScript((value) => localStorage.setItem('theme', value), storedTheme);
      await page.goto('/');
      const shown = page.locator('.theme-toggle svg').filter({ visible: true });
      await expect(shown).toHaveCount(1);
      await expect(shown).toHaveClass(new RegExp(`\\b${icon}\\b`));
    });
  });
}

// Owner 2026-10-12 (#206): on a dark OS a click to light showed both icons stacked.
for (const os of ['light', 'dark'] as const) {
  test.describe(`OS ${os}`, () => {
    test.use({ colorScheme: os });

    test('every toggle click leaves exactly one icon visible', async ({ page }) => {
      await page.goto('/');
      const shown = page.locator('.theme-toggle svg').filter({ visible: true });
      for (const icon of os === 'dark' ? ['sun', 'moon', 'sun'] : ['moon', 'sun', 'moon']) {
        await expect(shown).toHaveCount(1);
        await expect(shown).toHaveClass(new RegExp(`\\b${icon}\\b`));
        await page.locator('.theme-toggle').click();
      }
    });
  });
}
