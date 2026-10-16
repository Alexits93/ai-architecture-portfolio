import { test, expect } from '@playwright/test';

// #348: /about/ with the owner's hobbies, causes and goals, reached from the home link and the menu.
test('/about/ shows the heading and the hobbies, causes and goals in order', async ({ page }) => {
  await page.goto('/about/');
  await expect(page.locator('main .eyebrow').first()).toHaveText('/ About');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Get to know me');
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Hobbies', 'Causes', 'Goals']);
});

test('the home link between the photos and the now card opens /about/', async ({ page }) => {
  await page.goto('/');
  await page.locator('#get-to-know').getByRole('link', { name: 'Get to know me' }).click();
  await expect(page).toHaveURL('/about/');
});

test('the menu opens /about/', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('dialog', { name: 'Site navigation' }).getByRole('link', { name: 'About' }).click();
  await expect(page).toHaveURL('/about/');
});
