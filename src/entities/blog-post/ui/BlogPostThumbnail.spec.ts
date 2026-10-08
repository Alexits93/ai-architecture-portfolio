import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestPost } from '../model/test-post.fixture';
import BlogPostThumbnail from './BlogPostThumbnail.astro';

const mockPost = createTestPost({ id: 'test-post', tags: ['test', 'astro'] });

describe('BlogPostThumbnail Entity (Astro)', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  const render = async () => {
    const html = await container.renderToString(BlogPostThumbnail, { props: { post: mockPost } });
    return new JSDOM(html).window.document;
  };

  it('renders title, description, and a slug permalink with trailing slash', async () => {
    const doc = await render();
    expect(doc.querySelector('h2')?.textContent).toBe('Title test-post');
    expect(doc.querySelector('p')?.textContent).toBe('Description test-post');
    expect(doc.querySelector('a')?.getAttribute('href')).toBe('/blog/test-post/');
  });

  it('renders the tags', async () => {
    const doc = await render();
    const tags = [...doc.querySelectorAll('.tag')].map((t) => t.textContent);
    expect(tags).toEqual(['test', 'astro']);
  });
});
