import { globSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { SITE } from '../../src/shared/config/site';

// Every built page renders through BaseLayout with one complete SEO head (#113).
const ROUTES = globSync('**/*.html', { cwd: 'dist' }).map((file) => `/${file.replace(/index\.html$/, '')}`);

const TITLES: Record<string, string> = {
  '/': SITE.title,
  '/cv/': 'CV | Patrik Alexits',
  '/blog/': 'Blog | Patrik Alexits',
  '/privacy-policy/': 'Privacy Policy | Patrik Alexits',
  '/cookie-disclaimer/': 'Cookie Disclaimer | Patrik Alexits',
};

test('finds the built pages', () => expect(ROUTES.length).toBeGreaterThan(5));

for (const route of ROUTES) {
  test(`one SEO head on ${route}`, async ({ page }) => {
    await page.goto(route);
    const title = TITLES[route] ?? new RegExp(`^.+ \\| ${SITE.name}$`);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('title')).toHaveCount(1);
    await expect(page.locator('meta[name="description"]')).toHaveCount(1);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S/);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://www.pa-tech.dev${route}`);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', title);
    await expect(page.locator('script[src="/theme.js"]')).toHaveCount(1);
  });
}
