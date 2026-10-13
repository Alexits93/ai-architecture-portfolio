import { test, expect } from '@playwright/test';

// #217: the projects block on the built home page, from src/content/projects.yaml. Vitest has no collection
// data (see e2e/cv-experience.spec.ts), so the real entries are checked here.
test.use({ reducedMotion: 'reduce' });

test('shows the three projects in order, and links only the public repo', async ({ page }) => {
  await page.goto('/');
  const projects = page.getByRole('region', { name: 'Projects' });
  await expect(projects.getByRole('heading', { level: 3 })).toHaveText(['pa-tech.dev', 'Evento web applications', 'SCSS framework']);
  await expect(projects.getByRole('article').nth(2)).toContainText('85% less CSS code');
  const links = projects.getByRole('link');
  await expect(links).toHaveCount(1);
  await expect(links).toHaveAccessibleName('View source of pa-tech.dev (Opens in new tab)');
  await expect(links).toHaveAttribute('href', 'https://github.com/Alexits93/ai-architecture-portfolio');
});
