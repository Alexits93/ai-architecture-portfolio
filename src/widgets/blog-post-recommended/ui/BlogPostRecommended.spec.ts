import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import BlogPostRecommended from './BlogPostRecommended.astro';

vi.mock('astro:content', () => ({
  getCollection: vi.fn().mockResolvedValue([
    {
      id: 'test',
      body: '',
      collection: 'blog',
      data: {
        title: 'Test',
        description: 'Test',
        publishDate: new Date(),
        tags: [],
        isFeatured: false,
        isRecommended: true,
      },
    },
  ]),
}));

describe('BlogPostRecommended Widget (Astro)', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render the recommended post thumbnails', async () => {
    const html = await container.renderToString(BlogPostRecommended);
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const section = doc.querySelector('section#blog-section');
    expect(section).not.toBeNull();

    const thumbnail = doc.querySelector('.blog-post-thumbnail');
    expect(thumbnail).not.toBeNull();
  });

  it('should render with custom class', async () => {
    const html = await container.renderToString(BlogPostRecommended, { props: { blogPostClass: 'custom-class' } });
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const section = doc.querySelector('section#blog-section.custom-class');
    expect(section).not.toBeNull();
  });
});
