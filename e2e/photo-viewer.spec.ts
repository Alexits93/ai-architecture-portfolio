import assert from 'node:assert/strict';
import { test, expect, type Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

// #350: a photo in the home row opens a larger view in a native dialog. Invoker commands open and close it; the only
// script is the morph through a same-document View Transition.
const photo = (page: Page) => page.locator('#photos ul > li > button').nth(2);
const dialog = (page: Page) => page.locator('#photos dialog').nth(2);

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('a click opens the photo with its caption, the close button closes it and focus returns', async ({ page }) => {
    await page.goto('/');
    const alt = await photo(page).locator('img').getAttribute('alt');
    assert(alt !== null);
    await photo(page).click();
    await expect(dialog(page)).toBeVisible();
    await expect(page.getByRole('dialog', { name: alt })).toBeVisible();
    await expect.poll(() => dialog(page).locator('img').evaluate((img) => img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0)).toBe(true);
    await dialog(page).getByRole('button', { name: 'Close photo' }).click();
    await expect(dialog(page)).toBeHidden();
    await expect(photo(page)).toBeFocused();
  });

  test('Enter opens the photo and Esc closes it', async ({ page }) => {
    await page.goto('/');
    await photo(page).focus();
    await page.keyboard.press('Enter');
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    await expect(photo(page)).toBeFocused();
  });

  test('a click outside the photo closes it where closedby is supported', async ({ page }) => {
    await page.goto('/');
    test.skip(!(await page.evaluate(() => 'closedBy' in HTMLDialogElement.prototype)), 'no closedby');
    await photo(page).click();
    await expect(dialog(page)).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(dialog(page)).toBeHidden();
  });

  test('the open photo has no WCAG 2.2 AA violations', async ({ page }) => {
    await page.goto('/');
    await photo(page).click();
    await expect(dialog(page)).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});

// A mouse drag scrolls the row and must not open the photo it ends on.
test.describe('mouse drag at 390 px', () => {
  test.use({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });

  test('a drag over a photo scrolls the row without opening it', async ({ page }) => {
    await page.goto('/');
    const box = await photo(page).boundingBox();
    assert(box !== null);
    const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 130, y, { steps: 10 });
    await page.mouse.up();
    await expect(page.locator('#photos dialog[open]')).toHaveCount(0);
  });
});

test.describe('motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the photo morphs from the row where View Transitions exist', async ({ page }) => {
    await page.goto('/');
    test.skip(!(await page.evaluate(() => 'startViewTransition' in document)), 'no View Transitions');
    await photo(page).click();
    await expect
      .poll(() =>
        page.evaluate(() =>
          document.documentElement.getAnimations({ subtree: true }).some((animation) => {
            const effect = animation.effect;
            return effect instanceof KeyframeEffect && effect.pseudoElement === '::view-transition-group(photo)';
          }),
        ),
        { intervals: [20] },
      )
      .toBe(true);
    await expect(dialog(page)).toBeVisible();
  });
});
