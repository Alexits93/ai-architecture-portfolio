import { test, expect, type Locator, type Page } from '@playwright/test';

// A reader's whole path through the blog: home, menu, Blog, a category, a post, the post's category
// link, then Back twice. Each step checks the URL, the heading and the current category link.
type Input = 'mouse' | 'keyboard';

// Keyboard: Tab until the target has focus, then Enter, as a keyboard-only reader would.
const activate = async (page: Page, target: Locator, input: Input) => {
  if (input === 'mouse') return target.click();
  for (let i = 0; i < 60 && !(await target.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
  await page.keyboard.press('Enter');
};

const categoryNav = (page: Page) => page.getByRole('navigation', { name: 'Blog categories' });

interface BlogPage { path: string; heading: string; current: string }
const ALL: BlogPage = { path: '/blog/', heading: 'All posts', current: 'All' };
const AI: BlogPage = { path: '/blog/category/ai/', heading: 'Posts on AI', current: 'AI' };

const expectBlogPage = async (page: Page, { path, heading, current }: BlogPage) => {
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
  await expect(categoryNav(page).locator('[aria-current="page"]')).toHaveText(current);
};

const expectOnlyCategory = async (page: Page, tag: string) => {
  const tags = await page.locator('.blog-grid .eyebrow').allTextContents();
  expect(tags.length).toBeGreaterThan(0);
  expect(new Set(tags.map((text) => text.trim()))).toEqual(new Set([tag]));
};

const journey = async (page: Page, input: Input) => {
  await page.goto('/');
  await activate(page, page.getByRole('button', { name: 'Open menu' }), input);
  const menu = page.getByRole('dialog', { name: 'Site navigation' });
  await expect(menu).toBeVisible();
  await activate(page, menu.getByRole('link', { name: 'Blog' }), input);
  await expectBlogPage(page, ALL);

  await activate(page, categoryNav(page).getByRole('link', { name: 'AI', exact: true }), input);
  await expectBlogPage(page, AI);
  await expectOnlyCategory(page, 'AI');

  const card = page.locator('.blog-grid .blog-post-thumbnail').first();
  const postPath = await card.getAttribute('href');
  expect(postPath).toMatch(/^\/blog\/[a-z0-9-]+\/$/);
  await activate(page, card, input);
  await expect(page).toHaveURL(new RegExp(`${postPath}$`));

  await activate(page, page.locator('#post-hero .eyebrow a'), input);
  await expectBlogPage(page, AI);

  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${postPath}$`));
  await page.goBack();
  await expectBlogPage(page, AI);
  await expectOnlyCategory(page, 'AI');
};

for (const width of [1280, 375]) {
  test.describe(`at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const input of ['mouse', 'keyboard'] as const) {
      test(`a reader finds AI posts from the home page by ${input}`, async ({ page }) => {
        await journey(page, input);
      });
    }
  });
}
