import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { getCollection } from 'astro:content';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestPost } from '@/entities/blog-post/testing';
import BlogFeed from './BlogFeed.astro';

// Mock astro:content
vi.mock('astro:content', () => ({
  getCollection: vi.fn(),
}));

// We must also mock the internal astro implementations that BlogPostThumbnail needs if any, 
// but it seems the thumbnail just renders standard Astro components and an Image.
// Wait, BlogPostThumbnail might use the astro `Image` component which fails in AstroContainer unless properly configured.
// Let's assume AstroContainer can render Image natively or we mock it.

const standardPost1 = createTestPost({ id: 'standard-1', publishDate: '2026-02-01', tags: ['vue', 'react'] });
const standardPost2 = createTestPost({ id: 'standard-2', publishDate: '2026-03-01', tags: ['react', 'astro'] });
const standardPost3 = createTestPost({ id: 'standard-3', publishDate: '2026-01-01' });
const featuredPost = createTestPost({ id: 'featured-1', publishDate: '2026-04-01', tags: ['svelte'], isFeatured: true });

describe('BlogFeed Widget (Astro) - Initialization', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
    vi.mocked(getCollection).mockResolvedValue([standardPost1, standardPost2, standardPost3, featuredPost]);
  });

  const render = async () => {
    const html = await container.renderToString(BlogFeed);
    return new JSDOM(html).window.document;
  };

  it('filters out featured posts and sorts remaining by newest', async () => {
    const doc = await render();
    const wrappers = doc.querySelectorAll('.blog-post-wrapper');
    expect(wrappers.length).toBe(3);
    
    // Ordered by newest: standardPost2 (March), standardPost1 (Feb), standardPost3 (Jan)
    const titles = Array.from(doc.querySelectorAll('h2')).map((el) => el.textContent);
    expect(titles).toEqual(['Title standard-2', 'Title standard-1', 'Title standard-3']);
  });
});

describe('BlogFeed Widget (Astro) - Tags and Attributes', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
    vi.mocked(getCollection).mockResolvedValue([standardPost1, standardPost2, standardPost3, featuredPost]);
  });

  const render = async () => {
    const html = await container.renderToString(BlogFeed);
    return new JSDOM(html).window.document;
  };



  it('extracts unique and sorted tags from standard posts only', async () => {
    const doc = await render();
    const tagCheckboxes = doc.querySelectorAll('input[type="checkbox"][name="tag"]');
    const tags = Array.from(tagCheckboxes).map((input) => input.getAttribute('value'));
    
    // 'svelte' should not be present because it belongs to a featured post.
    // 'astro', 'react', 'vue' should be present and sorted.
    expect(tags).toEqual(['astro', 'react', 'vue']);
  });

  it('assigns correct data-tags attribute to post wrappers for JS filtering', async () => {
    const doc = await render();
    const wrappers = doc.querySelectorAll('.blog-post-wrapper');
    
    // standardPost2 is first
    expect(wrappers[0].getAttribute('data-tags')).toBe('react,astro');
    
    // standardPost1 is second
    expect(wrappers[1].getAttribute('data-tags')).toBe('vue,react');

    // standardPost3 is third and has no tags
    expect(wrappers[2].getAttribute('data-tags')).toBe('');
  });

  it('renders the tag filter as a fieldset, with no form or submit button', async () => {
    const doc = await render();
    expect(doc.querySelector('blog-feed-interactive .blog-post-filter')?.tagName).toBe('FIELDSET');
    expect(doc.querySelector('form, .filter-submit')).toBeNull();
  });
});
