import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import * as contentModule from 'astro:content';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
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
    vi.mocked(contentModule.getCollection).mockResolvedValue(posts);
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

  it('links "See more" to the blog index route', async () => {
    const doc = await render();
    expect(doc.querySelector('.wrapper-bottom a')?.getAttribute('href')).toBe('/blog/');
  });

  it('applies the optional class', async () => {
    const doc = await render({ blogPostClass: 'custom-class' });
    expect(doc.querySelector('section.custom-class')).not.toBeNull();
  });
});
