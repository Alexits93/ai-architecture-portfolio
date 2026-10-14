import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { CollectionEntry } from 'astro:content';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, assert, vi } from 'vitest';
import { createTestPost } from './fixtures/post';
import Index from '@/pages/index.astro';
import { ROUTES, SITE } from '@/consts';
import MockContent from './fixtures/MockContent.astro';

// Vitest has no collection data, so the posts, the services, the positions, the now entry and the rendered Markdown are
// fixtures (#218, #226, #244, #257).
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
const position = (id: string, start: number, end: number | null): CollectionEntry<'experience'> => ({
  id,
  collection: 'experience',
  data: { id, start, end, role: `Role ${id}`, company: `Company ${id}`, highlights: [`Highlight ${id}`], emphasis: [], skills: [] },
});
// Oldest first on purpose: the rows follow the start year, not the collection order.
const positions = [position('older', 2017, 2018), position('current', 2024, null)];
const collections: Record<string, readonly object[]> = { services, experience: positions };
vi.mock('astro:content', async (importOriginal) => {
  const actual = await importOriginal<typeof import('astro:content')>();
  return {
    ...actual,
    getCollection: async (name: string) => (name in collections ? collections[name] : posts),
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

  // The hero, the now card, the service cards, the work rows, the principles and the writing list span the page above
  // one reading column (#243, #254, #256, #257, #258, #219).
  it('renders the hero, now, the services, the work rows, the principles, the writing, then the home blocks in one column', async () => {
    const doc = new JSDOM(await container.renderToString(Index)).window.document;

    const main = doc.querySelector('main');
    assert.exists(main);
    expect(main.children).toHaveLength(7);
    assert.exists(main.querySelector(':scope > #hero:first-child + #now + #services + #work + #principles + #writing + .home'));
    const column = doc.querySelector('main > .home');
    assert.exists(column);
    expect([...column.children].map((child) => child.id)).toEqual(['connect']);
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

// The now card, with its eyebrow, text and a machine-readable updated date (#218, #258).
it('renders the now block with its updated date', async () => {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Index)).window.document;

  const now = doc.querySelector('section#now');
  assert.exists(now);
  expect(now.querySelector('h2')).toHaveProperty('textContent', 'Now');
  expect(now.querySelector('.eyebrow')).toHaveProperty('textContent', '/ Currently');
  expect(now.textContent).toContain('Mock Rendered Content');
  const updated = now.querySelector('time');
  assert.exists(updated);
  expect(updated.getAttribute('datetime')).toBe('2026-10-13');
  expect(updated.textContent).toBe('13 October 2026');
});

// The principles list after Work, from src/content/principles/principles.md (#244, #258).
it('renders the principles block with its heading', async () => {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Index)).window.document;

  const principles = doc.querySelector('section#principles');
  assert.exists(principles);
  expect(principles.querySelector('h2')).toHaveProperty('textContent', 'Principles');
  expect(principles.querySelector('.eyebrow')).toHaveProperty('textContent', '/ How I work');
  expect(principles.textContent).toContain('Mock Rendered Content');
});

// The writing list: one title link per post, newest first, its category and date, then a link to /blog/ (#219).
it('renders the writing list newest first with category, date and an All posts link', async () => {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Index)).window.document;

  const writing = doc.querySelector('section#writing');
  assert.exists(writing);
  expect(writing.querySelector('h2')).toHaveProperty('textContent', 'Latest writing');
  const rows = [...writing.querySelectorAll('ul > li')];
  expect(rows.map((row) => [...row.querySelectorAll('a')].map((link) => [link.textContent, link.getAttribute('href')]))).toEqual([
    [['Title newer-post', '/blog/newer-post/']],
    [['Title older-post', '/blog/older-post/']],
    [['Title featured-post', '/blog/featured-post/']],
  ]);
  const [first] = rows;
  assert.exists(first);
  expect(first.querySelector('.meta')).toHaveProperty('textContent', 'AI · 1 May 2026');
  const date = first.querySelector('time');
  assert.exists(date);
  expect(date.getAttribute('datetime')).toBe('2026-05-01');
  // The morph script pairs [data-post-card] links with the post header (#210).
  const link = first.querySelector('a[data-post-card] [data-morph="title"]');
  assert.exists(link);

  const all = writing.querySelector(':scope > .head a');
  assert.exists(all);
  expect([all.textContent, all.getAttribute('href')]).toEqual(['All posts', ROUTES.blog]);
  expect(doc.querySelector('#blog-featured, #blog-section')).toBeNull();
});

// Work rows from the experience collection, newest first, with a "Full CV" pill (#257, direction A on #252).
it('renders a work row per position, newest first, and a Full CV link', async () => {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Index)).window.document;

  const work = doc.querySelector('section#work');
  assert.exists(work);
  expect(work.querySelector('h2')).toHaveProperty('textContent', 'Work experience');
  const rows = [...work.querySelectorAll('ul > li')].map((row) =>
    ['.role', '.years', '.company'].map((part) => row.querySelector(part)).map((el) => (el === null ? null : el.textContent)),
  );
  expect(rows).toEqual([
    ['Role current', '2024 - Present', 'Company current'],
    ['Role older', '2017 - 2018', 'Company older'],
  ]);
  const cv = work.querySelector('a');
  assert.exists(cv);
  expect(cv.textContent).toBe('Full CV');
  expect(cv.getAttribute('href')).toBe(ROUTES.cv);
  expect(doc.querySelector('#hero a')).toBeNull();
  expect(doc.querySelector('section#open')).toBeNull();
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
