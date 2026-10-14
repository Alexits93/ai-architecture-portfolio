import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { Page } from 'astro';
import { JSDOM } from 'jsdom';
import { describe, it, expect, assert } from 'vitest';
import { createTestPost } from './fixtures/post';
import type { BlogPost, Category } from '@/lib/posts';
import BlogFeed from '@/pages/blog/_BlogFeed.astro';

const PAGE_SIZE = 10;

const postsOf = (count: number): BlogPost[] => Array.from({ length: count }, (_, i) => createTestPost({ id: `post-${i + 1}` }));

// The page object paginate() passes for one page of `posts` (https://docs.astro.build/en/reference/routing-reference/#page-prop, Astro 7).
const pageOf = (posts: BlogPost[], currentPage: number, base = '/blog/'): Page<BlogPost> => {
  const lastPage = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const urlOf = (n: number) => (n === 1 ? base : `${base}${n}/`);
  const start = (currentPage - 1) * PAGE_SIZE;
  return {
    data: posts.slice(start, start + PAGE_SIZE),
    start,
    end: Math.min(start + PAGE_SIZE, posts.length) - 1,
    total: posts.length,
    currentPage,
    size: PAGE_SIZE,
    lastPage,
    url: {
      current: urlOf(currentPage),
      prev: currentPage > 1 ? urlOf(currentPage - 1) : undefined,
      next: currentPage < lastPage ? urlOf(currentPage + 1) : undefined,
      first: currentPage > 1 ? urlOf(1) : undefined,
      last: currentPage < lastPage ? urlOf(lastPage) : undefined,
    },
  };
};

const render = async (page: Page<BlogPost>, current?: Category) => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(BlogFeed, { props: { text: 'All', accent: 'posts', page, current } });
  return new JSDOM(html).window.document;
};

const cards = (doc: Document) => [...doc.querySelectorAll('.blog-grid .blog-post-thumbnail')].map((card) => card.getAttribute('href'));
const pagination = (doc: Document) => doc.querySelector('nav[aria-label="Pagination"]');

// The element `selector` matches inside the pagination nav; fails the test if either is missing.
const inPagination = (doc: Document, selector: string) => {
  const nav = pagination(doc);
  assert.exists(nav);
  const el = nav.querySelector(selector);
  assert.exists(el);
  return el;
};

// The home design system (#299): an eyebrow over a display h1, the categories as pills, the posts as raised cards.
describe('BlogFeed head', () => {
  it('renders the Blog eyebrow, a display h1 and the category pills', async () => {
    const doc = await render(pageOf(postsOf(1), 1), 'AI');
    expect(doc.querySelector('.eyebrow')).toHaveProperty('textContent', '/ Blog');
    const heading = doc.querySelector('h1.display[data-size="section"]');
    assert.exists(heading);
    expect(heading.textContent).toBe('All posts');
    const pills = [...doc.querySelectorAll('nav[aria-label="Blog categories"] a.pill')];
    expect(pills.map((pill) => pill.textContent)).toEqual(['All', 'AI', 'Architecture']);
    expect(pills.map((pill) => pill.getAttribute('aria-current'))).toEqual([null, 'page', null]);
    expect(doc.querySelectorAll('.blog-grid h2.display')).toHaveLength(1);
  });
});

describe('BlogFeed pagination (#160)', () => {
  it('renders no cards and no pagination nav for an empty list', async () => {
    const doc = await render(pageOf([], 1));
    expect(cards(doc)).toHaveLength(0);
    expect(pagination(doc)).toBeNull();
  });

  it('renders all 10 posts without a pagination nav', async () => {
    const doc = await render(pageOf(postsOf(10), 1));
    expect(cards(doc)).toHaveLength(10);
    expect(pagination(doc)).toBeNull();
  });

  it('renders 10 of 11 posts with a Next link and no Previous link on page 1', async () => {
    const doc = await render(pageOf(postsOf(11), 1));
    expect(cards(doc)).toHaveLength(10);
    expect(inPagination(doc, 'a[rel="next"]').getAttribute('href')).toBe('/blog/2/');
    expect(doc.querySelector('nav[aria-label="Pagination"] a[rel="prev"]')).toBeNull();
    const current = inPagination(doc, 'a[aria-current="page"]');
    expect(current.getAttribute('href')).toBe('/blog/');
    expect(current.textContent.trim()).toBe('Page 1 of 2');
  });

  it('renders post 11 with a Previous link to /blog/ and no Next link on page 2', async () => {
    const doc = await render(pageOf(postsOf(11), 2));
    expect(cards(doc)).toEqual(['/blog/post-11/']);
    expect(inPagination(doc, 'a[rel="prev"]').getAttribute('href')).toBe('/blog/');
    expect(doc.querySelector('nav[aria-label="Pagination"] a[rel="next"]')).toBeNull();
    expect(inPagination(doc, 'a[aria-current="page"]').textContent.trim()).toBe('Page 2 of 2');
  });

  it('keeps the category nav current on a paginated category page', async () => {
    const doc = await render(pageOf(postsOf(11), 2, '/blog/category/ai/'), 'AI');
    const currentCategory = doc.querySelector('nav[aria-label="Blog categories"] [aria-current="page"]');
    assert.exists(currentCategory);
    expect(currentCategory.textContent.trim()).toBe('AI');
    expect(inPagination(doc, 'a[rel="prev"]').getAttribute('href')).toBe('/blog/category/ai/');
  });
});
