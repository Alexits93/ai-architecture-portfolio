import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { getCollection } from 'astro:content';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestPost } from '@/entities/blog-post/testing';
import BlogPostFeatured from './BlogPostFeatured.astro';

vi.mock('astro:content', () => ({ getCollection: vi.fn() }));

describe('BlogPostFeatured Widget (Astro)', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  const renderWith = async (posts: ReturnType<typeof createTestPost>[]) => {
    vi.mocked(getCollection).mockResolvedValueOnce(posts);
    return new JSDOM(await container.renderToString(BlogPostFeatured)).window.document;
  };

  it('renders the featured post', async () => {
    const doc = await renderWith([
      createTestPost({ id: 'other', publishDate: '2026-05-01' }),
      createTestPost({ id: 'picked', isFeatured: true }),
    ]);
    expect(doc.querySelector('.blog-post-thumbnail')?.getAttribute('href')).toBe('/blog/picked/');
  });

  it('falls back to the newest post when none is featured', async () => {
    const doc = await renderWith([
      createTestPost({ id: 'old', publishDate: '2026-01-01' }),
      createTestPost({ id: 'new', publishDate: '2026-06-01' }),
    ]);
    expect(doc.querySelector('.blog-post-thumbnail')?.getAttribute('href')).toBe('/blog/new/');
  });

  it('renders no thumbnail for an empty collection', async () => {
    const doc = await renderWith([]);
    expect(doc.querySelector('.blog-post-thumbnail')).toBeNull();
  });
});
