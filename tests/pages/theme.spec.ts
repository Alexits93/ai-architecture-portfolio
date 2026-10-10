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

// The page colours, read from the token that global.css switches per theme.
const background = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const stored = (page: Page) => page.evaluate(() => localStorage.getItem('theme'));

test.describe('Theme toggle', () => {
  test.use({ colorScheme: 'light' });

  test('switches the theme from the keyboard and announces the pressed state', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');

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

test.describe('Theme after a change outside the page', () => {
  test.use({ colorScheme: 'light' });

  test('follows an OS switch to dark without a stored choice', async ({ page }) => {
    await page.goto('/');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(toggle(page, true)).toBeVisible();
    await expect(page.locator('.theme-toggle svg').filter({ visible: true })).toHaveClass(/\bsun\b/);
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  });

  test('switches the colours with the OS theme without a stored choice', async ({ page, browserName }) => {
    test.fail(browserName === 'webkit', 'The stylesheet does not load in WebKit e2e (#91)');
    await page.goto('/');
    const light = await background(page);
    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await background(page)).not.toBe(light);
  });

  test('keeps a stored light theme when the OS switches to dark', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'light'));
    await page.goto('/');
    const light = await background(page);

    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(toggle(page, false)).toBeVisible();
    expect(await background(page)).toBe(light);
  });

  test('follows the OS after another tab removes the stored choice', async ({ page, context }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('seeded')) {
        sessionStorage.setItem('seeded', '1');
        localStorage.setItem('theme', 'dark');
      }
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const other = await context.newPage();
    await other.goto('/');
    await other.evaluate(() => localStorage.removeItem('theme'));

    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    await expect(toggle(page, false)).toBeVisible();
  });
});

test.describe('Theme toggle on a dark OS', () => {
  test.use({ colorScheme: 'dark' });

  test('shows the dark OS theme as pressed and stores light on click', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    await expect(toggle(page, true)).toBeVisible();
    await expect(page.locator('.theme-toggle svg').filter({ visible: true })).toHaveClass(/\bsun\b/);

    await toggle(page, true).click();
    await expect(toggle(page, false)).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await stored(page)).toBe('light');
  });

  test('keeps a stored light theme over the dark OS theme', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'light'));
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(toggle(page, false)).toBeVisible();
  });
});
