import { test, expect, type Page } from '@playwright/test';

const verifyPostVisibility = async (page: Page, expectedTag: string | null, wrappersCount: number) => {
  const wrappers = page.locator('.blog-post-wrapper');
  for (let i = 0; i < wrappersCount; i++) {
    const wrapper = wrappers.nth(i);
    const dataTags = await wrapper.getAttribute('data-tags');
    const tags = dataTags ? dataTags.split(',') : [];
    const hasTag = expectedTag ? tags.includes(expectedTag) : false;
    await expect(wrapper).toHaveJSProperty('hidden', !hasTag);
  }
};

test.describe('Blog Page filtering', () => {
  test('should filter posts when checking tags', async ({ page }) => {
    await page.goto('/blog/');
    const wrappers = page.locator('.blog-post-wrapper');
    const initialCount = await wrappers.count();
    expect(initialCount).toBeGreaterThan(0);
    expect(await wrappers.locator('[hidden]').count()).toBe(0);

    await expect(page.getByRole('group', { name: 'Filter by tag' })).toBeVisible();
    const checkboxes = page.locator('input[type="checkbox"][name="tag"]');
    expect(await checkboxes.count()).toBeGreaterThan(0);

    const firstCheckbox = checkboxes.nth(0);
    const tagValue = await firstCheckbox.getAttribute('value');

    await firstCheckbox.locator('..').click();
    await verifyPostVisibility(page, tagValue, initialCount);

    await firstCheckbox.locator('..').click();
    await verifyPostVisibility(page, null, 0);
    expect(await wrappers.locator('[hidden]').count()).toBe(0);
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
