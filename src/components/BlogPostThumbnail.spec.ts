import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, assert } from 'vitest';
import { createTestPost } from '../../tests/fixtures/post';
import BlogPostThumbnail from './BlogPostThumbnail.astro';

const mockPost = createTestPost({ id: 'test-post', category: 'Architecture' });

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

  // The card is one link, so the category is text, not a nested link (#90).
  it('renders the category as text and no arrow icon', async () => {
    const doc = await render();
    const tags = [...doc.querySelectorAll('.skill-tag')].map((t) => t.textContent.trim());
    expect(tags).toEqual(['#architecture']);
    expect(doc.querySelectorAll('a')).toHaveLength(1);
    expect(doc.querySelector('svg')).toBeNull();
  });
});
