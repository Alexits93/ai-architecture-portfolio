import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, assert } from 'vitest';
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
    const [title, description, link] = [doc.querySelector('h2'), doc.querySelector('p'), doc.querySelector('a')];
    assert.exists(title);
    assert.exists(description);
    assert.exists(link);
    expect(title.textContent).toBe('Title test-post');
    expect(description.textContent).toBe('Description test-post');
    expect(link.getAttribute('href')).toBe('/blog/test-post/');
  });

  it('renders the tags', async () => {
    const doc = await render();
    const tags = [...doc.querySelectorAll('.skill-tag')].map((t) => t.textContent.trim());
    expect(tags).toEqual(['#test', '#astro']);
  });
});
