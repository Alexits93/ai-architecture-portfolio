import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { CollectionEntry } from 'astro:content';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, assert, vi } from 'vitest';
import Index from '@/pages/index.astro';
import { SITE } from '@/shared/config';
import MockContent from '@/widgets/blog-post-reader/__mocks__/MockContent.astro';

// Vitest has no collection data, so the now entry and its rendered Markdown are fixtures (#218).
const nowEntry: CollectionEntry<'now'> = {
  id: 'now',
  collection: 'now',
  data: { updated: new Date('2026-10-13T00:00:00.000Z') },
  body: '- Mock line',
};

vi.mock('astro:content', async (importOriginal) => {
  const actual = await importOriginal<typeof import('astro:content')>();
  return {
    ...actual,
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

// The now block comes first in the blocks, with its text and a machine-readable updated date (#218).
it('renders the now block first in the home blocks', async () => {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Index)).window.document;

  const now = doc.querySelector('.home-blocks > section#now:first-child');
  assert.exists(now);
  expect(now.querySelector('h2')).toHaveProperty('textContent', 'Now');
  expect(now.textContent).toContain('Mock Rendered Content');
  const updated = now.querySelector('time');
  assert.exists(updated);
  expect(updated.getAttribute('datetime')).toBe('2026-10-13');
  expect(updated.textContent).toBe('13 October 2026');
});
