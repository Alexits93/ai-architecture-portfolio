import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, assert } from 'vitest';
import { SITE } from '@/consts';
import SeoHead from './SeoHead.astro';

const SITE_URL = 'https://www.pa-tech.dev';
const baseProps = { title: 'Post Title', description: 'Post description' };

type SeoProps = { title: string; description: string; ogImage?: { path: string; alt: string }; type?: 'website' | 'article'; publishedTime?: Date; jsonLd?: Record<string, string>; noindex?: boolean };

const render = async (props: SeoProps = baseProps, site: string | undefined = SITE_URL) => {
  const container = await AstroContainer.create({ astroConfig: { site } });
  const html = await container.renderToString(SeoHead, {
    props,
    request: new Request(`${SITE_URL}/blog/my-post/?utm_source=linkedin`),
  });
  return new JSDOM(`<head>${html}</head>`).window.document;
};

const meta = (doc: Document, key: string) => {
  const tag = doc.querySelector(`meta[property="${key}"], meta[name="${key}"]`);
  assert.exists(tag, `meta ${key}`);
  return tag.getAttribute('content');
};

describe('SeoHead (Astro)', () => {
  it('emits identical absolute canonical and og:url without query strings', async () => {
    const doc = await render();
    const link = doc.querySelector('link[rel="canonical"]');
    assert.exists(link);
    const canonical = link.getAttribute('href');
    expect(canonical).toBe(`${SITE_URL}/blog/my-post/`);
    expect(meta(doc, 'og:url')).toBe(canonical);
  });

  it('emits title, description, and website defaults with absolute default OG image', async () => {
    const doc = await render();
    const el = doc.querySelector('title');
    assert.exists(el);
    expect(el.textContent).toBe('Post Title');
    expect(meta(doc, 'description')).toBe('Post description');
    expect(meta(doc, 'og:type')).toBe('website');
    expect(meta(doc, 'og:image')).toBe(`${SITE_URL}/og.png`);
    expect(meta(doc, 'og:image:alt')).toBe(SITE.defaultOgImage.alt);
    expect(meta(doc, 'twitter:image:alt')).toBe(SITE.defaultOgImage.alt);
    expect(meta(doc, 'twitter:card')).toBe('summary_large_image');
    expect(doc.querySelector('meta[property="article:published_time"]')).toBeNull();
    expect(doc.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it('leaves the theme script to the layout', async () => {
    const doc = await render();
    expect(doc.querySelector('script[src="/theme.js"]')).toBeNull();
  });

  it('emits article metadata and escaped JSON-LD when provided', async () => {
    const doc = await render({
      ...baseProps,
      type: 'article',
      ogImage: { path: '/blog/my-post/og.png', alt: 'Post Title. Post subtitle' },
      publishedTime: new Date('2026-10-08T00:00:00Z'),
      jsonLd: { '@type': 'BlogPosting', headline: '</script>' },
    });
    expect(meta(doc, 'og:type')).toBe('article');
    expect(meta(doc, 'og:image')).toBe(`${SITE_URL}/blog/my-post/og.png`);
    expect(meta(doc, 'og:image:alt')).toBe('Post Title. Post subtitle');
    expect(meta(doc, 'twitter:image:alt')).toBe('Post Title. Post subtitle');
    expect(meta(doc, 'article:published_time')).toBe('2026-10-08T00:00:00.000Z');
    const ld = doc.querySelector('script[type="application/ld+json"]');
    assert.exists(ld);
    expect(JSON.parse(ld.textContent).headline).toBe('</script>');
  });
});

// The 404 page must stay out of search results (#154), so it names no canonical URL either (#307).
it('SeoHead emits robots noindex and drops the canonical only when asked', async () => {
  const doc = await render();
  expect(doc.querySelector('meta[name="robots"]')).toBeNull();
  const noindexDoc = await render({ ...baseProps, noindex: true });
  expect(meta(noindexDoc, 'robots')).toBe('noindex');
  expect(noindexDoc.querySelector('link[rel="canonical"]')).toBeNull();
});
