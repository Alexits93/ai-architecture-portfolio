import { test, expect, type Page } from '@playwright/test';

// Every wrapper is visible without a tag; with one, only the posts that carry it.
const expectFilteredBy = async (page: Page, tag: string | null) => {
  const wrappers = page.locator('.blog-post-wrapper');
  const count = await wrappers.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const tags = (await wrappers.nth(i).getAttribute('data-tags'))?.split(',') ?? [];
    await expect(wrappers.nth(i)).toHaveJSProperty('hidden', tag !== null && !tags.includes(tag));
  }
};

const hiddenWrappers = (page: Page) => page.locator('.blog-post-wrapper[hidden]');

test.describe('Blog Page filtering', () => {
  test('should filter posts when checking tags', async ({ page }) => {
    await page.goto('/blog/');
    await expect(hiddenWrappers(page)).toHaveCount(0);

    await expect(page.getByRole('group', { name: 'Filter by tag' })).toBeVisible();
    const checkboxes = page.locator('input[type="checkbox"][name="tag"]');
    expect(await checkboxes.count()).toBeGreaterThan(0);

    const firstCheckbox = checkboxes.nth(0);
    const tagValue = await firstCheckbox.getAttribute('value');

    await firstCheckbox.locator('..').click();
    await expectFilteredBy(page, tagValue);

    await firstCheckbox.locator('..').click();
    await expectFilteredBy(page, null);
    await expect(hiddenWrappers(page)).toHaveCount(0);
  });

  // Without the script the checkboxes would do nothing, so they stay hidden (CSS :defined).
  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('hides the filter and shows every post', async ({ page }) => {
      await page.goto('/blog/');
      await expect(page.getByRole('group', { name: 'Filter by tag' })).toBeHidden();
      await expect(page.locator('.blog-post-wrapper').first()).toBeVisible();
    });
  });
});

test.describe('Blog page on a small viewport', () => {
  for (const theme of ['light', 'dark']) {
    test(`fits a 320 px viewport in the ${theme} theme`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto('/blog/');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      // Names every element past the right edge, so a failure shows the cause.
      const pastEdge = await page.evaluate(() =>
        [...document.querySelectorAll('body *')]
          .filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
          .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} right=${Math.round(el.getBoundingClientRect().right)}`),
      );
      expect(pastEdge).toEqual([]);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('Blog filter by keyboard', () => {
  test('filters with the keyboard only', async ({ page, browserName }) => {
    // CI WebKit: :focus-visible matches, the tag outline computes to none. #90 replaces the checkboxes.
    test.fail(browserName === 'webkit', 'No focus outline on the checkbox tag in WebKit (#90)');
    await page.goto('/blog/');
    const checkbox = page.getByRole('group', { name: 'Filter by tag' }).getByRole('checkbox').first();
    const tag = await checkbox.getAttribute('value');
    for (let i = 0; i < 30 && !(await checkbox.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press('Tab');
    }
    await expect(checkbox).toBeFocused();
    expect(await checkbox.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    await expect(checkbox.locator('+ .skill-tag-visual')).not.toHaveCSS('outline-style', 'none');

    await page.keyboard.press('Space');
    await expect(checkbox).toBeChecked();
    await expectFilteredBy(page, tag);

    await page.keyboard.press('Space');
    await expectFilteredBy(page, null);
  });
});
