import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { getCollection } from 'astro:content';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, vi, assert } from 'vitest';
import { createTestPost } from './fixtures/post';
import BlogPostRecommended from '@/pages/blog/_BlogPostRecommended.astro';

vi.mock('astro:content', () => ({ getCollection: vi.fn() }));

const posts = [
  createTestPost({ id: 'oldest', publishDate: '2025-01-01' }),
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

  it('renders every post newest first with slug permalinks', async () => {
    const doc = await render();
    expect(hrefs(doc)).toEqual(['/blog/first/', '/blog/second/', '/blog/oldest/']);
  });

  it('omits the excluded post', async () => {
    const doc = await render({ excludeId: 'first' });
    expect(hrefs(doc)).toEqual(['/blog/second/', '/blog/oldest/']);
  });

  // The home Writing head: eyebrow, display h2, and the All posts pill. Card titles nest under it as h3.
  it('renders the head as on home, with h3 card titles', async () => {
    const doc = await render();
    const heading = doc.querySelector('#blog-section h2.display[data-size="section"]');
    assert.exists(heading);
    expect(heading.textContent).toBe('Recommended articles');
    expect(doc.querySelector(`#blog-section[aria-labelledby="${heading.id}"]`)).not.toBeNull();
    expect(doc.querySelectorAll('.blog-post-thumbnail h3')).toHaveLength(3);
    expect(doc.querySelectorAll('.blog-post-thumbnail h2')).toHaveLength(0);
  });

  // Lighthouse link-text: the text names the destination (https://developer.chrome.com/docs/lighthouse/seo/link-text).
  it('links "All posts" to the blog index route', async () => {
    const doc = await render();
    const el = doc.querySelector('#blog-section a.pill');
    assert.exists(el);
    expect(el.getAttribute('href')).toBe('/blog/');
    expect(el.textContent).toBe('All posts');
  });
});
