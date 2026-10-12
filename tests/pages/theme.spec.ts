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

// The page colour, a light-dark() token in tokens.css that follows the used color-scheme.
const background = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const stored = (page: Page) => page.evaluate(() => localStorage.getItem('theme'));

// Stores dark on the first load only, so a later reload does not undo another tab's change.
const seedDarkOnce = (page: Page) =>
  page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('theme', 'dark');
    }
  });

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
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  });

  test('switches the colours with the OS theme without a stored choice', async ({ page }) => {
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

});

test.describe('Theme after a change in another tab', () => {
  test.use({ colorScheme: 'light' });

  test('follows the OS after another tab removes the stored choice', async ({ page, context }) => {
    await seedDarkOnce(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const other = await context.newPage();
    await other.goto('/');
    await other.evaluate(() => localStorage.removeItem('theme'));

    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    await expect(toggle(page, false)).toBeVisible();
  });

  test('follows the OS after another tab clears localStorage', async ({ page, context }) => {
    await seedDarkOnce(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const other = await context.newPage();
    await other.goto('/');
    await other.evaluate(() => localStorage.clear());

    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    await expect(toggle(page, false)).toBeVisible();
  });

  // A bfcache restore keeps the old DOM, so the page re-reads the key. Playwright's Chromium and Firefox
  // never restored from bfcache here, so the test fires the restore's pageshow. A same-tab write fires
  // no storage event (MDN Window storage_event), so only the pageshow listener can re-render.
  test('re-reads the stored theme on a pageshow from bfcache', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme', 'dark'));
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');

    await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(toggle(page, true)).toBeVisible();
  });
});

// MDN says light-dark() resolves against the used color-scheme but does not document a data-attribute
// toggle (https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark), so this proves it (#197).
test.describe('light-dark() tokens follow the manual toggle', () => {
  test.use({ colorScheme: 'light' });

  const colorScheme = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);

  test('switches color-scheme and the colours without a reload', async ({ page, browser }) => {
    const darkOs = await browser.newPage({ colorScheme: 'dark' });
    await darkOs.goto('/');
    const dark = await background(darkOs);
    await darkOs.close();

    await page.goto('/');
    const light = await background(page);
    expect(light).not.toBe(dark);

    await toggle(page, false).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await colorScheme(page)).toBe('dark');
    expect(await background(page)).toBe(dark);

    await toggle(page, true).click();
    expect(await colorScheme(page)).toBe('light');
    expect(await background(page)).toBe(light);
  });

  test('shows the dark colours of a stored dark theme on a light OS', async ({ page, browser }) => {
    const darkOs = await browser.newPage({ colorScheme: 'dark' });
    await darkOs.goto('/');
    const dark = await background(darkOs);
    await darkOs.close();

    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto('/');
    expect(await background(page)).toBe(dark);
  });
});

test.describe('Theme toggle with blocked storage', () => {
  test.use({ colorScheme: 'light' });

  test('keeps the OS theme and still toggles in the page', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (error) => errors.push(error));
    await page.addInitScript(() => {
      const blocked = () => {
        throw new DOMException('Storage is blocked', 'SecurityError');
      };
      Storage.prototype.getItem = blocked;
      Storage.prototype.setItem = blocked;
    });
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    await expect(toggle(page, false)).toBeVisible();

    await toggle(page, false).click();
    await expect(toggle(page, true)).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(errors).toEqual([]);
  });
});

test.describe('Theme toggle on a dark OS', () => {
  test.use({ colorScheme: 'dark' });

  test('shows the dark OS theme as pressed and stores light on click', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    await expect(toggle(page, true)).toBeVisible();

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
