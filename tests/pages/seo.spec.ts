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

// Post pages describe themselves as BlogPosting; other pages carry no article data (#121).
for (const route of ROUTES) {
  const isPost = /^\/blog\/[^/]+\/$/.test(route);
  test(`${isPost ? 'BlogPosting' : 'no article data'} on ${route}`, async ({ page }) => {
    await page.goto(route);
    const scripts = page.locator('script[type="application/ld+json"]');
    const publishedTime = page.locator('meta[property="article:published_time"]');
    if (!isPost) {
      await expect(scripts).toHaveCount(0);
      await expect(publishedTime).toHaveCount(0);
      return;
    }
    await expect(scripts).toHaveCount(1);
    await expect(publishedTime).toHaveAttribute('content', /^\d{4}-\d{2}-\d{2}T/);
    const data: { '@type': string; headline: string } = JSON.parse((await scripts.textContent()) ?? '');
    expect(data['@type']).toBe('BlogPosting');
    expect(data.headline).toBe(await page.locator('h1').first().textContent());
  });
}
