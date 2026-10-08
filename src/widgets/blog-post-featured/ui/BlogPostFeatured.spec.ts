import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach } from 'vitest';
import BlogPostFeatured from './BlogPostFeatured.astro';

describe('BlogPostFeatured Widget (Astro)', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render the stub', async () => {
    const html = await container.renderToString(BlogPostFeatured);
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const section = doc.querySelector('section#blog-featured');
    expect(section).not.toBeNull();
  });
});
