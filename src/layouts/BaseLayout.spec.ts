import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, assert } from 'vitest';
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

const meta = (doc: Document, key: string) => {
  const tag = doc.querySelector(`meta[property="${key}"], meta[name="${key}"]`);
  assert.exists(tag, `meta ${key}`);
  return tag.getAttribute('content');
};

describe('BaseLayout (Astro)', () => {
  it('renders the document shell with the SEO head', async () => {
    const doc = await render();
    expect(doc.documentElement.lang).toBe('en-GB');
    expect(doc.querySelectorAll('title')).toHaveLength(1);
    expect(doc.title).toBe('Page Title');
    expect(meta(doc, 'description')).toBe('Page description');
    const el = doc.querySelector('link[rel="canonical"]');
    assert.exists(el);
    expect(el.getAttribute('href')).toBe(`${SITE_URL}/cv/`);
    expect(meta(doc, 'og:title')).toBe('Page Title');
    // The theme script is injected inline by astro.config.mjs, which the container does not read (#86).
    expect(doc.querySelector('script[src="/theme.js"]')).toBeNull();
    const manifest = doc.head.querySelector('link[rel="manifest"]');
    assert.exists(manifest);
    expect(manifest.getAttribute('href')).toBe('/site.webmanifest');
    expect(meta(doc, 'viewport')).toBe('width=device-width');
  });

  it('renders the header and menu before the page content', async () => {
    const doc = await render();
    const main = doc.getElementById('page-main');
    assert.exists(main);
    expect(main.parentElement).toBe(doc.body);
    expect(main.textContent).toBe('Page content');
    for (const selector of ['header', 'dialog#site-menu']) {
      const el = doc.body.querySelector(selector);
      assert.exists(el, selector);
      expect(el.compareDocumentPosition(main) & main.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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

// Header and menu share only the dialog ID through commandfor (#157).
it('renders the commandfor target once and points every commandfor at it', async () => {
  const doc = await render();
  expect(doc.querySelectorAll('#site-menu')).toHaveLength(1);
  const targets = [...doc.querySelectorAll('[commandfor]')].map((el) => el.getAttribute('commandfor'));
  expect(targets).toEqual(['site-menu', 'site-menu']);
});
