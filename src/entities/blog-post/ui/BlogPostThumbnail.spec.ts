import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach } from 'vitest';
import type { BlogPost } from '../model/types';
import BlogPostThumbnail from './BlogPostThumbnail.astro';

const mockPost: BlogPost = {
  id: 'test-post',
  body: 'This is a test post.',
  collection: 'blog',
  data: {
    title: 'Test Title',
    description: 'Test Description',
    publishDate: new Date('2026-10-08'),
    tags: ['test', 'astro'],
    isFeatured: true,
    isRecommended: false,
  },
};

describe('BlogPostThumbnail Widget (Astro)', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render the post title and description', async () => {
    const html = await container.renderToString(BlogPostThumbnail, { props: { post: mockPost } });
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const title = doc.querySelector('h2');
    expect(title?.textContent).toBe('Test Title');

    const desc = doc.querySelector('p');
    expect(desc?.textContent).toBe('Test Description');

    const link = doc.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/blog/test-post');
  });

  it('should render the tags', async () => {
    const html = await container.renderToString(BlogPostThumbnail, { props: { post: mockPost } });
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const tags = doc.querySelectorAll('.tag');
    expect(tags.length).toBe(2);
    expect(tags[0].textContent).toBe('test');
    expect(tags[1].textContent).toBe('astro');
  });
});
