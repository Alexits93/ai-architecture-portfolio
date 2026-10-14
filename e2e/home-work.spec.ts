import { test, expect } from '@playwright/test';

// #257: the work rows on the built home page, from src/content/experience.yaml. Vitest has no content store, so the
// real entries are checked here.
test.use({ reducedMotion: 'reduce' });

test('lists every position newest first with its years and company', async ({ page }) => {
  await page.goto('/');
  const rows = page.getByRole('region', { name: 'Work experience' }).getByRole('listitem');
  await expect(rows.locator('.role')).toHaveText([
    'Lead Frontend Architect & Engineer',
    'Frontend Developer',
    'Fullstack Developer',
    'Fullstack Developer',
  ]);
  await expect(rows.locator('.years')).toHaveText(['2024 - Present', '2020 - 2023', '2019 - 2020', '2017 - 2018']);
  await expect(rows.locator('.company')).toHaveText(['Swiss Learning Hub', 'IBM iX DACH', 'Solvistas GmbH', 'Voov Ltd.']);
});

test('the Full CV pill opens /cv/', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('region', { name: 'Work experience' }).getByRole('link', { name: 'Full CV' }).click();
  await expect(page).toHaveURL(/\/cv\/$/);
});
