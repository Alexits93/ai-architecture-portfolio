import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import * as contentModule from 'astro:content';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import BlogPostFeatured from './BlogPostFeatured.astro';

vi.mock('astro:content', () => ({
  getCollection: vi.fn(),
}));

describe('BlogPostFeatured Widget (Astro) - Featured Post', () => {
  let container: AstroContainer;
  const mockGetCollection = vi.mocked(contentModule.getCollection);

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render the featured post thumbnail', async () => {
    mockGetCollection.mockResolvedValueOnce([
      {
        id: 'test',
        body: '',
        collection: 'blog',
        data: {
          title: 'Test Featured',
          description: 'Test',
          publishDate: new Date(),
          tags: [],
          isFeatured: true,
          isRecommended: false,
        },
      },
    ]);

    const html = await container.renderToString(BlogPostFeatured);
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const section = doc.querySelector('section#blog-featured');
    expect(section).not.toBeNull();

    const thumbnail = doc.querySelector('.blog-post-thumbnail');
    expect(thumbnail).not.toBeNull();
    expect(thumbnail?.textContent).toContain('Test Featured');
  });
});

describe('BlogPostFeatured Widget (Astro) - Fallback Post', () => {
  let container: AstroContainer;
  const mockGetCollection = vi.mocked(contentModule.getCollection);

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fallback to the first post if no featured post exists', async () => {
    mockGetCollection.mockResolvedValueOnce([
      {
        id: 'fallback',
        body: '',
        collection: 'blog',
        data: {
          title: 'Test Fallback',
          description: 'Test',
          publishDate: new Date(),
          tags: [],
          isFeatured: false,
          isRecommended: false,
        },
      },
    ]);

    const html = await container.renderToString(BlogPostFeatured);
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const thumbnail = doc.querySelector('.blog-post-thumbnail');
    expect(thumbnail).not.toBeNull();
    expect(thumbnail?.textContent).toContain('Test Fallback');
  });
});

