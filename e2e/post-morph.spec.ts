import { test, expect, type Page } from '@playwright/test';

// Story #209, Task #210: a card's title morphs into the post's title through a cross-document
// view transition. The names are set by pageswap and pagereveal, as in Chrome's cross-document guide
// (https://developer.chrome.com/docs/web-platform/view-transitions/cross-document). Engines without cross-document
// view transitions navigate normally.
test.use({ reducedMotion: 'no-preference' });

// Records on every new document which view-transition groups its reveal animated.
const recordGroups = (page: Page) =>
  page.addInitScript(() => {
    addEventListener('pagereveal', (event) => {
      if (event.viewTransition === null) return;
      void event.viewTransition.ready.then(() => {
        const groups = document.getAnimations().flatMap((animation) => {
          const effect = animation.effect;
          if (!(effect instanceof KeyframeEffect) || effect.pseudoElement === null) return [];
          const match = /^::view-transition-group\((.+)\)$/.exec(effect.pseudoElement);
          return match === null ? [] : [match[1]];
        });
        sessionStorage.setItem('groups', JSON.stringify([...new Set(groups)].sort()));
      });
    });
  });

const groups = (page: Page) => page.evaluate(() => sessionStorage.getItem('groups'));

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  test.skip(!(await page.evaluate(() => 'onpagereveal' in window)), 'no cross-document view transitions');
  await recordGroups(page);
});

const MORPH = JSON.stringify(['post-title', 'root']);

test('a blog card morphs into the post, and Back morphs it home', async ({ page }) => {
  await page.goto('/blog/');
  const card = page.locator('.blog-post-thumbnail').first();
  const href = await card.getAttribute('href');
  await card.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect.poll(() => groups(page)).toBe(MORPH);

  await page.evaluate(() => sessionStorage.removeItem('groups'));
  await page.goBack();
  await expect(page).toHaveURL(/\/blog\/$/);
  await expect.poll(() => groups(page)).toBe(MORPH);
});

// The home writing rows carry [data-post-card] like the blog cards (#219).
test('a home writing row morphs into the post', async ({ page }) => {
  await page.goto('/');
  await page.locator('#writing [data-post-card]').first().click();
  await expect(page).toHaveURL(/\/blog\/.+\/$/);
  await expect.poll(() => groups(page)).toBe(MORPH);
});

test('a recommended card on a post morphs into the next post', async ({ page }) => {
  await page.goto('/blog/');
  await page.locator('.blog-post-thumbnail').first().click();
  await expect.poll(() => groups(page)).toBe(MORPH);
  await page.evaluate(() => sessionStorage.removeItem('groups'));

  await page.locator('#blog-section .blog-post-thumbnail').first().click();
  await expect.poll(() => groups(page)).toBe(MORPH);
});

test('the names are gone once the transition ran', async ({ page }) => {
  await page.goto('/blog/');
  await page.locator('.blog-post-thumbnail').first().click();
  await expect.poll(() => groups(page)).toBe(MORPH);
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll('h1, h2')].filter((el) => getComputedStyle(el).viewTransitionName !== 'none')
          .length,
      ),
    )
    .toBe(0);
});
