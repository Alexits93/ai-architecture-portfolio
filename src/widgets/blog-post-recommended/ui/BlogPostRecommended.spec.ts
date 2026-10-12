import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { getCollection } from 'astro:content';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, vi, assert } from 'vitest';
import { createTestPost } from '@/entities/blog-post/testing';
import BlogPostRecommended from './BlogPostRecommended.astro';

vi.mock('astro:content', () => ({ getCollection: vi.fn() }));

const posts = [
  createTestPost({ id: 'featured', isFeatured: true }),
  createTestPost({ id: 'first', publishDate: '2026-03-01' }),
  createTestPost({ id: 'second', publishDate: '2026-02-01' }),
];

describe('BlogPostRecommended Widget (Astro)', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
    vi.mocked(getCollection).mockResolvedValue(posts);
  });

  const render = async (props = {}) =>
    new JSDOM(await container.renderToString(BlogPostRecommended, { props })).window.document;

  const hrefs = (doc: Document) =>
    [...doc.querySelectorAll('.blog-post-thumbnail')].map((a) => a.getAttribute('href'));

  it('renders non-featured posts newest first with slug permalinks', async () => {
    const doc = await render();
    expect(hrefs(doc)).toEqual(['/blog/first/', '/blog/second/']);
  });

  it('omits the excluded post', async () => {
    const doc = await render({ excludeId: 'first' });
    expect(hrefs(doc)).toEqual(['/blog/second/']);
  });

  // Lighthouse link-text: the text names the destination (https://developer.chrome.com/docs/lighthouse/seo/link-text).
  it('links "See all articles" to the blog index route', async () => {
    const doc = await render();
    const el = doc.querySelector('.wrapper-bottom a');
    assert.exists(el);
    expect(el.getAttribute('href')).toBe('/blog/');
    expect(el.textContent).toBe('See all articles');
  });
});
