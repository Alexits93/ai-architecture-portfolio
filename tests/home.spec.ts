import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { CollectionEntry } from 'astro:content';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, assert, vi } from 'vitest';
import { createTestPost } from './fixtures/post';
import Index from '@/pages/index.astro';
import { ROUTES, SITE } from '@/consts';
import MockContent from './fixtures/MockContent.astro';

// Vitest has no collection data, so the posts, the services, the now entry and the rendered Markdown are fixtures (#218, #226, #244).
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
const service = (id: string, order: number): CollectionEntry<'services'> => ({
  id,
  collection: 'services',
  data: { id, order, kicker: `Kicker ${id}`, title: `Title ${id}`, text: `Text ${id}`, tools: [`Tool ${id}`] },
});
// Out of order on purpose: the cards follow `order`, not the collection order.
const services = [service('second', 2), service('first', 1)];
vi.mock('astro:content', async (importOriginal) => {
  const actual = await importOriginal<typeof import('astro:content')>();
  return {
    ...actual,
    getCollection: async (name: string) => (name === 'services' ? services : posts),
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

  // The hero and the service cards span the page above one reading column (#243, #254, #256).
  it('renders the hero, the services, then the home blocks in one column in reading order', async () => {
    const doc = new JSDOM(await container.renderToString(Index)).window.document;

    const main = doc.querySelector('main');
    assert.exists(main);
    expect(main.children).toHaveLength(3);
    assert.exists(main.querySelector(':scope > #hero:first-child + #services + .home'));
    const column = doc.querySelector('main > .home');
    assert.exists(column);
    expect([...column.children].map((child) => child.id)).toEqual([
      'work',
      'principles',
      'open',
      'now',
      'blog-featured',
      'blog-section',
      'connect',
    ]);
  });
});

// One site-wide title and the positioning pitch from SITE (#214). The h1 holds the full name for screen readers;
// the two big halves around the portrait are presentation (#254).
it('renders the name, SITE.role and SITE.pitch in the hero and the role in the SEO title', async () => {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Index)).window.document;

  const h1 = doc.querySelector('#hero h1');
  assert.exists(h1);
  expect(h1.textContent).toBe(SITE.name);
  const halves = [...doc.querySelectorAll('#hero .word')];
  expect(halves.map((half) => [half.textContent, half.getAttribute('aria-hidden')])).toEqual([
    ['Patrik', 'true'],
    ['Alexits', 'true'],
  ]);

  const kickers = [...doc.querySelectorAll('#hero .kicker')].map((kicker) => kicker.textContent);
  expect(kickers[0]).toBe(SITE.role);

  const portrait = doc.querySelector('#hero .portrait');
  assert.exists(portrait);
  expect(portrait.getAttribute('role')).toBe('img');

  const pitch = doc.querySelector('#hero .pitch');
  assert.exists(pitch);
  expect(pitch.textContent).toBe(SITE.pitch);

  const title = doc.querySelector('title');
  assert.exists(title);
  expect(title.textContent).toBe(`${SITE.name} | ${SITE.role}`);
});

// "What I do best": numbered cards in `order`, each with its kicker, text and tools (#256).
it('renders the service cards in order with their number, kicker, text and tools', async () => {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Index)).window.document;

  const section = doc.querySelector('section#services');
  assert.exists(section);
  const heading = section.querySelector('h2');
  assert.exists(heading);
  expect(heading.textContent).toBe('What I do best');
  const cards = [...section.querySelectorAll('ol > li.card')];
  expect(cards.map((card) => card.querySelector('h3')).map((h3) => (h3 === null ? null : h3.textContent))).toEqual([
    '01. Title first',
    '02. Title second',
  ]);
  const [first] = cards;
  assert.exists(first);
  expect(first.querySelector('.eyebrow')).toHaveProperty('textContent', 'Kicker first');
  expect(first.textContent).toContain('Text first');
  expect([...first.querySelectorAll('ul > li')].map((tool) => tool.textContent)).toEqual(['Tool first']);
});

// The now block, with its text and a machine-readable updated date (#218).
it('renders the now block with its updated date', async () => {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Index)).window.document;

  const now = doc.querySelector('section#now');
  assert.exists(now);
  expect(now.querySelector('h2')).toHaveProperty('textContent', 'Now');
  expect(now.textContent).toContain('Mock Rendered Content');
  const updated = now.querySelector('time');
  assert.exists(updated);
  expect(updated.getAttribute('datetime')).toBe('2026-10-13');
  expect(updated.textContent).toBe('13 October 2026');
});

// The principles list after Work, from src/content/principles/principles.md (#244).
it('renders the principles block with its heading', async () => {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Index)).window.document;

  const principles = doc.querySelector('section#principles');
  assert.exists(principles);
  expect(principles.querySelector('h2')).toHaveProperty('textContent', 'Principles');
  expect(principles.textContent).toContain('Mock Rendered Content');
});

// The featured card is the featured post; the recommended cards are the others, newest first (#226).
it('renders the blog fixtures as featured and recommended cards', async () => {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Index)).window.document;

  const hrefs = (selector: string) => [...doc.querySelectorAll(selector)].map((card) => card.getAttribute('href'));
  expect(hrefs('#blog-featured .blog-post-thumbnail')).toEqual(['/blog/featured-post/']);
  expect(hrefs('#blog-section .blog-post-thumbnail')).toEqual(['/blog/newer-post/', '/blog/older-post/']);
});

// Work is first-person prose that points to the CV; the hero carries no social icons on home (#243).
it('renders the Work paragraph with a link to the CV', async () => {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Index)).window.document;

  const work = doc.querySelector('section#work');
  assert.exists(work);
  expect(work.querySelector('h2')).toHaveProperty('textContent', 'Work');
  expect(work.textContent).toContain('I lead the frontend architecture and engineering at Swiss Learning Hub');
  const cv = work.querySelector('a');
  assert.exists(cv);
  expect(cv.getAttribute('href')).toBe(ROUTES.cv);
  expect(doc.querySelector('#hero a')).toBeNull();
});

// Rows of name, one line and a link, only for public artefacts. Same tab, owner decision on #242.
it('lists the things you can open, each with a same-tab link', async () => {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Index)).window.document;

  const open = doc.querySelector('section#open');
  assert.exists(open);
  expect(open.querySelector('h2')).toHaveProperty('textContent', 'Things you can open');
  const links = [...open.querySelectorAll('li a')];
  expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
    ['pa-tech.dev', 'https://github.com/Alexits93/ai-architecture-portfolio'],
  ]);
  expect(links.some((link) => link.hasAttribute('target'))).toBe(false);
});

// The socials end the page as a Connect line of named links, in the same tab (#243, #242).
it('ends with a Connect line of same-tab social links', async () => {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Index)).window.document;

  const connect = doc.querySelector('section#connect');
  assert.exists(connect);
  expect(connect.querySelector('h2')).toHaveProperty('textContent', 'Connect');
  const links = [...connect.querySelectorAll('a')];
  expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
    ['GitHub', 'https://github.com/Alexits93'],
    ['LinkedIn', 'https://www.linkedin.com/in/patrik-alexits/'],
    ['Stack Overflow', 'https://stackoverflow.com/users/9327050/patrik-alexits'],
    ['Instagram', 'https://www.instagram.com/akelafreestyle/'],
  ]);
  expect(links.some((link) => link.hasAttribute('target'))).toBe(false);
});
