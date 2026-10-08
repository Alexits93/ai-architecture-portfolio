import { test, expect } from '@playwright/test';

test('CV Page renders correctly', async ({ page }) => {
  const response = await page.goto('/cv/');
  expect(response?.status()).toBe(200);

  // Check Header exists
  const header = page.locator('header');
  await expect(header).toBeVisible();

  // Check AboutMe sidebar exists
  const aboutMe = page.locator('section#about-me');
  await expect(aboutMe).toBeVisible();

  // Check CV wrapper exists
  const cvWrapper = page.locator('.cv-wrapper');
  await expect(cvWrapper).toBeVisible();

  // Check for experience items
  const experienceItems = page.locator('.experience-item');
  await expect(experienceItems).toHaveCount(await experienceItems.count()); // Just check it doesn't throw, wait we want > 0
  const count = await experienceItems.count();
  expect(count).toBeGreaterThan(0);

  // Check download link
  const downloadLink = page.locator('a[download]');
  await expect(downloadLink).toBeVisible();
  await expect(downloadLink).toHaveAttribute('href', '/assets/files/patri-alexits-cv.pdf');
});
