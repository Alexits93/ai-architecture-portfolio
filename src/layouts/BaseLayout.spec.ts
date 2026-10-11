import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect } from 'vitest';
import BaseLayout from './BaseLayout.astro';

const SITE_URL = 'https://www.pa-tech.dev';

type LayoutProps = { title: string; description: string; type?: 'website' | 'article'; publishedTime?: Date };

const render = async (props: LayoutProps = { title: 'Page Title', description: 'Page description' }) => {
  const container = await AstroContainer.create({ astroConfig: { site: SITE_URL } });
  const html = await container.renderToString(BaseLayout, {
    props,
    slots: { default: '<main id="page-main">Page content</main>' },
    request: new Request(`${SITE_URL}/cv/`),
  });
  return new JSDOM(html).window.document;
};

const meta = (doc: Document, key: string) =>
  doc.querySelector(`meta[property="${key}"], meta[name="${key}"]`)?.getAttribute('content');

describe('BaseLayout (Astro)', () => {
  it('renders the document shell with the SEO head', async () => {
    const doc = await render();
    expect(doc.documentElement.lang).toBe('en');
    expect(doc.querySelectorAll('title')).toHaveLength(1);
    expect(doc.title).toBe('Page Title');
    expect(meta(doc, 'description')).toBe('Page description');
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE_URL}/cv/`);
    expect(meta(doc, 'og:title')).toBe('Page Title');
    // The theme script is injected inline by astro.config.mjs, which the container does not read (#86).
    expect(doc.querySelector('script[src="/theme.js"]')).toBeNull();
    expect(doc.head.querySelector('link[rel="manifest"]')?.getAttribute('href')).toBe('/site.webmanifest');
    expect(meta(doc, 'viewport')).toBe('width=device-width');
  });

  it('renders the header and menu before the page content', async () => {
    const doc = await render();
    const main = doc.getElementById('page-main');
    expect(main?.parentElement).toBe(doc.body);
    expect(main?.textContent).toBe('Page content');
    for (const selector of ['header', 'dialog#site-menu']) {
      const el = doc.body.querySelector(selector);
      expect(el && main && el.compareDocumentPosition(main) & main.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('passes article props through to the SEO head', async () => {
    const doc = await render({
      title: 'Post',
      description: 'Post description',
      type: 'article',
      publishedTime: new Date('2026-01-02T00:00:00Z'),
    });
    expect(meta(doc, 'og:type')).toBe('article');
    expect(meta(doc, 'article:published_time')).toBe('2026-01-02T00:00:00.000Z');
  });
});
