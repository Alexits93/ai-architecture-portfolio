import { test, expect, type Page } from '@playwright/test';

const verifyPostVisibility = async (page: Page, expectedTag: string | null, wrappersCount: number) => {
  const wrappers = page.locator('.blog-post-wrapper');
  for (let i = 0; i < wrappersCount; i++) {
    const wrapper = wrappers.nth(i);
    const dataTags = await wrapper.getAttribute('data-tags');
    const tags = dataTags ? dataTags.split(',') : [];
    const hasTag = expectedTag ? tags.includes(expectedTag) : false;
    const isHidden = await wrapper.evaluate((el) => (el as HTMLElement).hidden);
    expect(isHidden).toBe(!hasTag);
  }
};

test.describe('Blog Page filtering', () => {
  test('should filter posts when checking tags', async ({ page }) => {
    await page.goto('/blog/');
    const wrappers = page.locator('.blog-post-wrapper');
    const initialCount = await wrappers.count();
    
    if (initialCount === 0) return;
    
    expect(await wrappers.locator('[hidden]').count()).toBe(0);

    const checkboxes = page.locator('input[type="checkbox"][name="tag"]');
    if (await checkboxes.count() === 0) return;
    
    const firstCheckbox = checkboxes.nth(0);
    const tagValue = await firstCheckbox.getAttribute('value');
    
    await firstCheckbox.locator('..').click();
    await verifyPostVisibility(page, tagValue, initialCount);
  });
});
