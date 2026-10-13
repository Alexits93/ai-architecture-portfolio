import { test, expect } from '@playwright/test';

// #215: /cv/ renders src/content/experience.yaml from the built site. Vitest cannot load collection
// data (https://docs.astro.build/en/guides/testing/ documents no content store for getViteConfig), so the
// real entries are checked here and ExperienceList.spec.ts covers the widget with a mocked getCollection.
test.use({ reducedMotion: 'reduce' });

test('renders the positions newest first', async ({ page }) => {
  await page.goto('/cv/');
  await expect(page.locator('.experience-item > span')).toHaveText(['2024 - Present', '2020 - 2023', '2019 - 2020', '2017 - 2018']);
  await expect(page.locator('.experience-item h3')).toHaveText([
    'Lead Frontend Architect & Engineer - Swiss Learning Hub',
    'Frontend Developer - IBM iX DACH',
    'Fullstack Developer - Solvistas GmbH',
    'Fullstack Developer - Voov Ltd.',
  ]);
});

test('renders the owner-written Swiss Learning Hub highlights and tags', async ({ page }) => {
  await page.goto('/cv/');
  const current = page.locator('.experience-item').nth(0);
  await expect(current.locator('.position p')).toHaveText([
    'Leading the frontend architecture and engineering of the Evento feature web migration, built with Nx and Angular.',
    'Mentoring juniors and leading the team with clear terminology, principles and high engineering standards.',
    'Among the people leading AI adoption at the company, engineering tailored user harnesses for LLM usage.',
  ]);
  await expect(current.locator('.skill-tag')).toHaveText([
    '#architecture', '#engineering', '#leadership', '#mentoring', '#nx', '#angular',
    '#frontend', '#scrum', '#git', '#accessibility', '#typescript',
  ]);
});

// Owner-confirmed; the #23 port had invented them. The exact text keeps the client and the shop unnamed.
test('renders the owner-confirmed IBM iX DACH highlights', async ({ page }) => {
  await page.goto('/cv/');
  await expect(page.locator('.experience-item').nth(1).locator('.position p')).toHaveText([
    'Led frontend development of a B2B webshop for licensed hair salon professionals, with more than 10 professional brands and about 1,500 products.',
    'Mentored junior frontend developers.',
  ]);
});

// The skill tags under each position read as one compact group, not a scattered grid.
// Bounds carry 0.5px for subpixel layout (Firefox measures 8.00005).
for (const width of [1440, 390]) {
  test.describe(`at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('skill tags sit close together', async ({ page }) => {
      await page.goto('/cv/');
      const groups = page.locator('.experience-item .tags');
      expect(await groups.count()).toBeGreaterThan(0);

      for (const group of await groups.all()) {
        const boxes = await group.locator('.skill-tag').evaluateAll((tags) =>
          tags.map((tag) => {
            const { x, y, width: w, height } = tag.getBoundingClientRect();
            return { x, y, right: x + w, bottom: y + height };
          }),
        );
        for (const [index, box] of boxes.slice(1).entries()) {
          const previous = boxes[index];
          if (Math.abs(box.y - previous.y) < 1) {
            // Same row: at most --space-2 (8px) between neighbours.
            expect(box.x - previous.right).toBeLessThanOrEqual(8.5);
          } else {
            // Next row: at most --space-1 (4px) below the row above.
            expect(box.y - previous.bottom).toBeLessThanOrEqual(4.5);
          }
        }
      }
    });
  });
}
