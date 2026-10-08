import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach } from 'vitest';
import BlogPostRecommended from './BlogPostRecommended.astro';

describe('BlogPostRecommended Widget (Astro)', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render the stub', async () => {
    const html = await container.renderToString(BlogPostRecommended);
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const section = doc.querySelector('section#blog-section');
    expect(section).not.toBeNull();
  });

  it('should render with custom class', async () => {
    const html = await container.renderToString(BlogPostRecommended, { props: { blogPostClass: 'custom-class' } });
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const section = doc.querySelector('section#blog-section.custom-class');
    expect(section).not.toBeNull();
  });
});
