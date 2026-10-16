import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

// Every built post page, e.g. /blog/<slug>/.
const POST_ROUTES = globSync('blog/*/index.html', { cwd: 'dist' }).map((file) => `/${file.replace(/index\.html$/, '')}`);

const BLOG_ROUTES = [
  { route: '/blog/', current: 'All', tag: null },
  { route: '/blog/category/ai/', current: 'AI', tag: 'AI' },
  { route: '/blog/category/architecture/', current: 'Architecture', tag: 'Architecture' },
];

const cardHrefs = (page: Page, scope: string) =>
  page.locator(`${scope} .blog-post-thumbnail`).evaluateAll((cards) => cards.map((card) => card.getAttribute('href')));

const categoryNav = (page: Page) => page.getByRole('navigation', { name: 'Blog categories' });

// Each card's category, from the kicker the thumbnail renders.
const cardCategories = (page: Page) => page.locator('.blog-grid .blog-post-thumbnail .eyebrow').allTextContents();

test.describe('Blog category pages', () => {
  for (const { route, current, tag } of BLOG_ROUTES) {
    test(`${route} lists its posts and marks only "${current}" as the current page`, async ({ page }) => {
      const response = await page.goto(route);
      assert(response !== null);
      const html = await response.text();
      for (const removed of ['blog-feed-interactive', 'data-tags', 'blog-post-filter']) expect(html).not.toContain(removed);

      const links = categoryNav(page).getByRole('link');
      await expect(links).toHaveText(['All', 'AI', 'Architecture']);
      await expect(categoryNav(page).locator('[aria-current]')).toHaveCount(1);
      await expect(categoryNav(page).getByRole('link', { name: current, exact: true })).toHaveAttribute('aria-current', 'page');

      const categories = (await cardCategories(page)).map((text) => text.trim());
      expect(categories.length).toBeGreaterThan(0);
      if (tag !== null) expect(new Set(categories)).toEqual(new Set([tag]));
    });
  }
});

test.describe('Blog category listing', () => {
  test('lists every post on /blog/', async ({ page }) => {
    await page.goto('/blog/');
    const hrefs = await page.locator('.blog-grid .blog-post-thumbnail').evaluateAll((cards) => cards.map((card) => card.getAttribute('href')));
    expect(hrefs.toSorted()).toEqual(POST_ROUTES.toSorted());
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('shows the same links and posts', async ({ page }) => {
      await page.goto('/blog/');
      await expect(categoryNav(page).getByRole('link')).toHaveText(['All', 'AI', 'Architecture']);
      await expect(page.locator('.blog-grid .blog-post-thumbnail')).toHaveCount(POST_ROUTES.length);
      for (const card of await page.locator('.blog-grid .blog-post-thumbnail').all()) await expect(card).toBeVisible();
    });
  });

  test('returns to the category page with only its posts after Back', async ({ page }) => {
    await page.goto('/blog/category/ai/');
    await page.locator('.blog-grid .blog-post-thumbnail').first().click();
    await expect(page).toHaveURL(/\/blog\/[a-z0-9-]+\/$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/blog\/category\/ai\/$/);
    expect(new Set((await cardCategories(page)).map((text) => text.trim()))).toEqual(new Set(['AI']));
  });
});

test.describe('Blog category navigation by keyboard', () => {
  test('reaches every category with Tab and Enter, with a visible focus outline', async ({ page }) => {
    await page.goto('/blog/');
    for (const { route, current } of BLOG_ROUTES.slice(1)) {
      const link = categoryNav(page).getByRole('link', { name: current, exact: true });
      for (let i = 0; i < 30 && !(await link.evaluate((el) => el === document.activeElement)); i++) {
        await page.keyboard.press('Tab');
      }
      await expect(link).toBeFocused();
      expect(await link.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
      await expect(link).not.toHaveCSS('outline-style', 'none');
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`${route}$`));
      await expect(categoryNav(page).getByRole('link', { name: current, exact: true })).toHaveAttribute('aria-current', 'page');
    }
  });
});

// test.use sets the viewport before the page opens (https://playwright.dev/docs/emulation#viewport);
// page.setViewportSize hangs headed Firefox on KDE Wayland.
for (const width of [320, 375]) {
  test.describe(`Blog pages on a ${width} px viewport`, () => {
    test.use({ viewport: { width, height: 800 } });

    for (const { route } of BLOG_ROUTES) {
      for (const theme of ['light', 'dark']) {
        test(`${route} fits a ${width} px viewport in the ${theme} theme`, async ({ page }) => {
          await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
          await page.goto(route);
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
    }
  });
}

test.describe('Category link on a post page', () => {
  for (const route of POST_ROUTES) {
    test(`${route} links its category to the category page`, async ({ page }) => {
      await page.goto(route);
      const link = page.locator('#post-hero .eyebrow a');
      await expect(link).toHaveCount(1);
      const name = await link.textContent();
      assert(name !== null);
      expect(await link.getAttribute('href')).toBe(`/blog/category/${name.trim().toLowerCase()}/`);
    });
  }
});

test.describe('Recommended articles on a post page', () => {
  test('finds the built post pages', () => expect(POST_ROUTES.length).toBeGreaterThan(0));

  for (const route of POST_ROUTES) {
    // Every other post, newest first, up to 3; the blog index lists the posts newest first.
    test(`${route} recommends the newest other posts`, async ({ page }) => {
      await page.goto('/blog/');
      const newest = await cardHrefs(page, '.blog-grid');
      await page.goto(route);
      expect(await cardHrefs(page, '#blog-section')).toEqual(newest.filter((href) => href !== route).slice(0, 3));
    });
  }
});

// Firefox gave a card link that only wraps an <article> no name, so Orca read "link". Each card link is named by
// its title, on the blog index and under a post.
for (const route of ['/blog/', POST_ROUTES[0]]) {
  test(`card links on ${route} are named by their post title`, async ({ page }) => {
    await page.goto(route);
    const cards = await page.locator('.blog-post-thumbnail').all();
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) await expect(card).toHaveAccessibleName(await card.locator('.title').innerText());
  });
}

// Focus rings show only on :focus-visible, so a mouse click draws none
// (https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible).
test('a mouse click on a category link draws no focus outline', async ({ page }) => {
  await page.goto('/blog/');
  const filter = page.getByRole('navigation', { name: 'Blog categories' }).getByRole('link', { name: 'AI' });
  await filter.evaluate((el) => el.addEventListener('click', (event) => event.preventDefault()));
  await filter.click();
  expect(await filter.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none');
});

// WCAG 1.4.1: the current category is marked by an underline, not by colour alone.
test('the current blog category is underlined', async ({ page }) => {
  await page.goto('/blog/');
  const current = page.getByRole('navigation', { name: 'Blog categories' }).getByRole('link', { name: 'All' });
  await expect(current).toHaveAttribute('aria-current', 'page');
  const decoration = await current.evaluate((el) => {
    const style = getComputedStyle(el);
    return { line: style.textDecorationLine, color: style.textDecorationColor, text: style.color };
  });
  expect(decoration.line).toBe('underline');
  expect(decoration.color).toBe(decoration.text);
});
