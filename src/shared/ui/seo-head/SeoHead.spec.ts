import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect } from 'vitest';
import SeoHead from './SeoHead.astro';

const SITE_URL = 'https://www.pa-tech.dev';
const baseProps = { title: 'Post Title', description: 'Post description' };

type SeoProps = { title: string; description: string; ogImagePath?: string; type?: 'website' | 'article'; publishedTime?: Date; jsonLd?: Record<string, string> };

const render = async (props: SeoProps = baseProps, site: string | undefined = SITE_URL) => {
  const container = await AstroContainer.create({ astroConfig: { site } });
  const html = await container.renderToString(SeoHead, {
    props,
    request: new Request(`${SITE_URL}/blog/my-post/?utm_source=linkedin`),
  });
  return new JSDOM(`<head>${html}</head>`).window.document;
};

const meta = (doc: Document, key: string) =>
  doc.querySelector(`meta[property="${key}"], meta[name="${key}"]`)?.getAttribute('content');

describe('SeoHead (Astro)', () => {
  it('emits identical absolute canonical and og:url without query strings', async () => {
    const doc = await render();
    const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href');
    expect(canonical).toBe(`${SITE_URL}/blog/my-post/`);
    expect(meta(doc, 'og:url')).toBe(canonical);
  });

  it('emits title, description, and website defaults with absolute default OG image', async () => {
    const doc = await render();
    expect(doc.querySelector('title')?.textContent).toBe('Post Title');
    expect(meta(doc, 'description')).toBe('Post description');
    expect(meta(doc, 'og:type')).toBe('website');
    expect(meta(doc, 'og:image')).toBe(`${SITE_URL}/og.png`);
    expect(meta(doc, 'twitter:card')).toBe('summary_large_image');
    expect(meta(doc, 'article:published_time')).toBeUndefined();
    expect(doc.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it('emits article metadata and escaped JSON-LD when provided', async () => {
    const doc = await render({
      ...baseProps,
      type: 'article',
      ogImagePath: '/blog/my-post/og.png',
      publishedTime: new Date('2026-10-08T00:00:00Z'),
      jsonLd: { '@type': 'BlogPosting', headline: '</script>' },
    });
    expect(meta(doc, 'og:type')).toBe('article');
    expect(meta(doc, 'og:image')).toBe(`${SITE_URL}/blog/my-post/og.png`);
    expect(meta(doc, 'article:published_time')).toBe('2026-10-08T00:00:00.000Z');
    const ld = doc.querySelector('script[type="application/ld+json"]')?.textContent ?? '';
    expect(JSON.parse(ld).headline).toBe('</script>');
  });


});
