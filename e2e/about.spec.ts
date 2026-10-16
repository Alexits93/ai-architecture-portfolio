import { test, expect } from '@playwright/test';

// /about/, reached from the home link and the menu.
test('/about/ shows the hobbies, causes and goals sections in order', async ({ page }) => {
  await page.goto('/about/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
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
