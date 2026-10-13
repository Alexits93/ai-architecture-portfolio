import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { CollectionEntry } from 'astro:content';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, assert, vi } from 'vitest';
import { createTestPost } from './fixtures/post';
import Index from '@/pages/index.astro';
import { SITE } from '@/consts';
import MockContent from './fixtures/MockContent.astro';

// Vitest has no collection data, so the posts, the now entry and its rendered Markdown are fixtures (#218, #226).
// e2e/home-blog.spec.ts checks the real posts on the built page.
const posts = [
  createTestPost({ id: 'featured-post', isFeatured: true }),
  createTestPost({ id: 'newer-post', publishDate: '2026-05-01' }),
  createTestPost({ id: 'older-post', publishDate: '2026-02-01' }),
];
const nowEntry: CollectionEntry<'now'> = {
  id: 'now',
  collection: 'now',
  data: { updated: new Date('2026-10-13T00:00:00.000Z') },
  body: '- Mock line',
};
// Out of order on purpose: the block sorts by `order` (#217).
const project = (id: string, order: number, url?: string): CollectionEntry<'projects'> => ({
  id,
  collection: 'projects',
  data: { id, order, name: `Project ${id}`, description: 'A web app.', role: 'Lead', stack: ['Angular', 'Nx'], outcome: 'Faster releases.', url },
});
const projects = [project('second', 2), project('first', 1, 'https://github.com/acme/first')];

vi.mock('astro:content', async (importOriginal) => {
  const actual = await importOriginal<typeof import('astro:content')>();
  return {
    ...actual,
    getCollection: async (name: string) => (name === 'projects' ? projects : posts),
    getEntry: async () => nowEntry,
    render: async () => ({ Content: MockContent, headings: [], remarkPluginFrontmatter: {} }),
  };
});

describe('Home Page (index.astro)', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    // The page renders SeoHead through BaseLayout, which needs `site` for absolute URLs.
    container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  });

  it('should render the layout with AboutMe and stubbed widgets', async () => {
    const html = await container.renderToString(Index);
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const main = doc.querySelector('main');
    expect(main).not.toBeNull();

    // The hero, then the blocks, in DOM order (#214).
    const wrapper = doc.querySelector('.home-wrapper');
    assert.exists(wrapper);
    expect([...wrapper.children].map((child) => [child.id, child.classList.contains('home-blocks')])).toEqual([
      ['about-me', false],
      ['', true],
    ]);

    // Check for BlogPostFeatured Stub
    const blogFeatured = doc.querySelector('.home-blocks section#blog-featured');
    expect(blogFeatured).not.toBeNull();

    // Check for BlogPostRecommended Stub
    const blogRecommended = doc.querySelector('.home-blocks section#blog-section');
    expect(blogRecommended).not.toBeNull();
  });

  // One site-wide title and the positioning pitch from SITE (#214).
  it('renders SITE.role and SITE.pitch in the hero and the role in the SEO title', async () => {
    const doc = new JSDOM(await container.renderToString(Index)).window.document;

    const role = doc.querySelector('#about-me h2');
    assert.exists(role);
    expect(role.textContent).toBe(SITE.role);

    const pitch = doc.querySelector('#about-me p');
    assert.exists(pitch);
    expect(pitch.textContent).toBe(SITE.pitch);

    const title = doc.querySelector('title');
    assert.exists(title);
    expect(title.textContent).toBe(`${SITE.name} | ${SITE.role}`);
  });
});

// The now block follows the projects, with its text and a machine-readable updated date (#218, #217).
it('renders the now block after the projects block', async () => {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Index)).window.document;

  const now = doc.querySelector('.home-blocks > section#projects + section#now');
  assert.exists(now);
  expect(now.querySelector('h2')).toHaveProperty('textContent', 'Now');
  expect(now.textContent).toContain('Mock Rendered Content');
  const updated = now.querySelector('time');
  assert.exists(updated);
  expect(updated.getAttribute('datetime')).toBe('2026-10-13');
  expect(updated.textContent).toBe('13 October 2026');
});

// The featured card is the featured post; the recommended cards are the others, newest first (#226).
it('renders the blog fixtures as featured and recommended cards', async () => {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Index)).window.document;

  const hrefs = (selector: string) => [...doc.querySelectorAll(selector)].map((card) => card.getAttribute('href'));
  expect(hrefs('#blog-featured .blog-post-thumbnail')).toEqual(['/blog/featured-post/']);
  expect(hrefs('#blog-section .blog-post-thumbnail')).toEqual(['/blog/newer-post/', '/blog/older-post/']);
});

// Projects come first in the home blocks, sorted by `order`; only a project with a public link renders one (#217).
it('renders the projects block first, in order, with links only where they exist', async () => {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Index)).window.document;

  const block = doc.querySelector('.home-blocks > section#projects:first-child');
  assert.exists(block);
  expect(block.querySelector('h2')).toHaveProperty('textContent', 'Projects');
  expect([...block.querySelectorAll('article h3')].map((name) => name.textContent)).toEqual(['Project first', 'Project second']);

  const [linked, unlinked] = block.querySelectorAll('article');
  assert.exists(linked);
  assert.exists(unlinked);
  expect(linked.textContent).toContain('Lead');
  expect(linked.textContent).toContain('Faster releases.');
  expect([...linked.querySelectorAll('.skill-tag')].map((tag) => tag.textContent.trim())).toEqual(['#angular', '#nx']);
  const link = linked.querySelector('a');
  assert.exists(link);
  expect(link.getAttribute('href')).toBe('https://github.com/acme/first');
  // Same tab, owner decision on #242: no target attribute.
  expect(link.hasAttribute('target')).toBe(false);
  expect(link.getAttribute('aria-label')).toBe('View source of Project first');
  expect(unlinked.querySelector('a')).toBeNull();
});
