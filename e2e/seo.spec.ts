import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { PRIVACY_POLICY_UPDATED, SITE } from '../src/consts';
import { readPostDates } from '../src/lib/sitemap-lastmod';

// Every built page renders through BaseLayout with one complete SEO head.
// 404.html builds from src/pages/404.astro, whose URL is /404/.
const ROUTES = globSync('**/*.html', { cwd: 'dist' }).map((file) => `/${file.replace(/index\.html$/, '').replace(/\.html$/, '/')}`);
// Draft posts are noindex and stay out of the sitemap.
const DRAFT_ROUTES = new Set(readPostDates('src/content/blog').filter((post) => post.draft).map((post) => `/blog/${post.id}/`));
const NOINDEX_ROUTES = new Set(['/404/', ...DRAFT_ROUTES]);
// @astrojs/sitemap leaves status code pages out of the sitemap; astro.config.mjs filters the drafts.
const SITEMAP_ROUTES = ROUTES.filter((route) => !NOINDEX_ROUTES.has(route));

const TITLES: Record<string, string> = {
  '/': SITE.title,
  '/about/': 'About | Patrik Alexits',
  '/cv/': 'CV | Patrik Alexits',
  '/blog/': 'Blog | Patrik Alexits',
  '/privacy-policy/': 'Privacy Policy | Patrik Alexits',
  '/cookie-disclaimer/': 'Cookie Disclaimer | Patrik Alexits',
};

test('finds the built pages', () => expect(ROUTES.length).toBeGreaterThan(5));

// Regression: HTML comments in templates shipped to every visitor with internal notes. Templates use {/* */}.
for (const route of ROUTES) {
  test(`${route} ships no source comment`, async ({ request }) => {
    expect(await (await request.get(route)).text()).not.toContain('<!--');
  });
}

for (const route of ROUTES) {
  test(`one SEO head on ${route}`, async ({ page }) => {
    await page.goto(route);
    const title = route in TITLES ? TITLES[route] : new RegExp(`^.+ \\| ${SITE.name}$`);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('title')).toHaveCount(1);
    await expect(page.locator('meta[name="description"]')).toHaveCount(1);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S/);
    // Search results show about 50 to 160 characters; five pages and the home page fell outside.
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    assert(description !== null);
    expect(description.length).toBeGreaterThanOrEqual(50);
    expect(description.length).toBeLessThanOrEqual(160);
    // A noindex page names no canonical: /404/ does not exist, and a draft post is not meant to be found.
    if (NOINDEX_ROUTES.has(route)) {
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    } else {
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://www.pa-tech.dev${route}`);
    }
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', title);
    // Two inline classic scripts in <head>, injected by astro.config.mjs: the theme script and the card-to-post
    // morph, whose pagereveal listener must run before the first render. No external copy.
    // Text locators skip <script> content, so read it directly. Astro's bundled scripts are type="module".
    const classicInline = page.locator('head script:not([src]):not([type])');
    const kinds = await classicInline.evaluateAll((els) =>
      els.map((el) => {
        if (el.textContent.includes("localStorage.getItem('theme')")) return 'theme';
        return el.textContent.includes("addEventListener('pagereveal'") ? 'morph' : 'other';
      }),
    );
    expect(kinds.toSorted()).toEqual(['morph', 'theme']);
    await expect(page.locator('script[src="/theme.js"]')).toHaveCount(0);
  });
}

// The sitemap lists exactly the built pages, so a new page or post needs no manual entry.
test('sitemap lists every built page', async ({ request }) => {
  const xml = await (await request.get('/sitemap-0.xml')).text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  expect(locs.toSorted()).toEqual(SITEMAP_ROUTES.map((route) => `https://www.pa-tech.dev${route}`).toSorted());
});

test('robots.txt points to the sitemap index', async ({ request }) => {
  await expect(request.get('/robots.txt').then((response) => response.text())).resolves.toContain(
    'Sitemap: https://www.pa-tech.dev/sitemap-index.xml',
  );
});

// Each page shares an image that exists at the size it declares, with an alt that describes it.
// The PNG IHDR chunk holds the width and height at bytes 16 to 23 (https://www.w3.org/TR/png-3/#11IHDR).
for (const route of ROUTES) {
  test(`og:image of ${route} is a 1200x630 PNG with alt text`, async ({ page, request }) => {
    await page.goto(route);
    const imageUrl = await page.locator('meta[property="og:image"]').getAttribute('content');
    assert(imageUrl !== null);
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', imageUrl);
    const response = await request.get(new URL(imageUrl).pathname);
    expect(response.status()).toBe(200);
    const png = await response.body();
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
    const alt = await page.locator('meta[property="og:image:alt"]').getAttribute('content');
    assert(alt !== null);
    await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute('content', alt);
    const isPost = /^\/blog\/[^/]+\/$/.test(route);
    if (isPost) {
      expect(imageUrl).toBe(`https://www.pa-tech.dev${route}og.png`);
      expect(alt).toBe(`${await page.locator('h1').textContent()}. ${await page.locator('#post-hero .subtitle').textContent()}`);
    } else {
      expect(imageUrl).toBe('https://www.pa-tech.dev/og.png');
      expect(alt).toBe(SITE.defaultOgImage.alt);
    }
  });
}

// Home names the owner and the site, /cv/ is the owner's profile page, posts are BlogPosting, other pages carry none
//.
const LD_TYPES: Record<string, string[]> = { '/': ['WebSite', 'Person'], '/cv/': ['ProfilePage'] };
for (const route of ROUTES) {
  const isPost = /^\/blog\/[^/]+\/$/.test(route);
  test(`structured data on ${route}`, async ({ page }) => {
    await page.goto(route);
    const scripts = page.locator('script[type="application/ld+json"]');
    const publishedTime = page.locator('meta[property="article:published_time"]');
    if (!isPost) {
      await expect(publishedTime).toHaveCount(0);
      if (!(route in LD_TYPES)) {
        await expect(scripts).toHaveCount(0);
        return;
      }
      await expect(scripts).toHaveCount(1);
      const json = await scripts.textContent();
      assert(json !== null);
      const data: { '@type'?: string; '@graph'?: { '@type': string }[] } = JSON.parse(json);
      const types = data['@graph'] === undefined ? [data['@type']] : data['@graph'].map((node) => node['@type']);
      expect(types).toEqual(LD_TYPES[route]);
      return;
    }
    await expect(scripts).toHaveCount(1);
    await expect(publishedTime).toHaveAttribute('content', /^\d{4}-\d{2}-\d{2}T/);
    const json = await scripts.textContent();
    assert(json !== null);
    const data: { '@type': string; headline: string; image: string; mainEntityOfPage: string; dateModified: string } =
      JSON.parse(json);
    expect(data['@type']).toBe('BlogPosting');
    expect(data.headline).toBe(await page.locator('h1').first().textContent());
    expect(data.image).toBe(`https://www.pa-tech.dev${route}og.png`);
    expect(data.mainEntityOfPage).toBe(`https://www.pa-tech.dev${route}`);
    expect(data.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
}

// Headings start at one h1 and go down one level at a time, so the outline has no gaps (WCAG 1.3.1).
for (const route of ROUTES) {
  test(`heading outline of ${route} skips no level`, async ({ page }) => {
    await page.goto(route);
    const levels = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll((els) => els.map((el) => Number(el.tagName[1])));
    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    expect(levels[0]).toBe(1);
    for (const [index, level] of levels.slice(1).entries()) expect(level).toBeLessThanOrEqual(levels[index] + 1);
  });
}

// lastmod comes from content dates: posts, the blog lists by their newest post and the privacy policy by its date.
// Home, /cv/ and the cookie page have no honest date, so they carry none.
test('sitemap lastmod matches the content dates', async ({ request, page }) => {
  const xml = await (await request.get('/sitemap-0.xml')).text();
  const lastmods = new Map(
    [...xml.matchAll(/<url><loc>https:\/\/www\.pa-tech\.dev([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)].map((match) => [
      match[1],
      match[2],
    ]),
  );
  // The lists show the draft posts too, so a draft still dates them; only the draft's own URL is missing.
  const postDates: string[] = [];
  for (const route of ROUTES.filter((path) => /^\/blog\/[^/]+\/$/.test(path) && !/^\/blog\/\d+\/$/.test(path))) {
    await page.goto(route);
    const json = await page.locator('script[type="application/ld+json"]').textContent();
    assert(json !== null);
    const data: { dateModified: string } = JSON.parse(json);
    expect(lastmods.get(route)).toBe(DRAFT_ROUTES.has(route) ? undefined : data.dateModified);
    postDates.push(data.dateModified);
  }
  expect(lastmods.get('/blog/')).toBe(postDates.toSorted().at(-1));
  expect(lastmods.get('/blog/category/ai/')).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(lastmods.get('/privacy-policy/')).toBe(PRIVACY_POLICY_UPDATED.toISOString());
  for (const route of ['/', '/cv/', '/cookie-disclaimer/']) expect(lastmods.get(route)).toBeUndefined();
});
