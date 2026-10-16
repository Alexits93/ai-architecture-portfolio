import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { CollectionEntry } from 'astro:content';
import { JSDOM } from 'jsdom';
import { it, expect, assert, vi } from 'vitest';
import Cv from '@/pages/cv.astro';
import { SITE, SOCIAL_LINKS } from '@/consts';

// Vitest has no collection data, so the experience entry is a fixture.
// e2e/cv-experience.spec.ts checks the real entries on the built page.
const entry: CollectionEntry<'experience'> = {
  id: 'acme',
  collection: 'experience',
  data: { id: 'acme', start: 2020, end: null, role: 'Role', company: 'Acme', highlights: ['Built it.'], emphasis: [], skills: ['TypeScript'] },
};

vi.mock('astro:content', () => ({ getCollection: async () => [entry] }));

// /cv/ shows the same site-wide title as the home hero.
it('renders SITE.role in the CV hero', async () => {
  // The page renders SeoHead through BaseLayout, which needs `site` for absolute URLs.
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Cv)).window.document;

  const role = doc.querySelector('#about-me .role');
  assert.exists(role);
  expect(role.textContent).toBe(SITE.role);
});

// The home design system: the CV eyebrow over the name as a display h1.
it('renders the CV eyebrow and the name as a display h1', async () => {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Cv)).window.document;

  expect(doc.querySelector('#about-me .eyebrow')).toHaveProperty('textContent', '/ CV');
  expect(doc.querySelector('#about-me h1.display[data-size="section"]')).toHaveProperty('textContent', SITE.name);
});

it('renders the experience list from the collection', async () => {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Cv)).window.document;

  expect([...doc.querySelectorAll('.experience-item h3')].map((h3) => h3.textContent)).toEqual(['Role - Acme']);
});

// /cv/ is the owner's profile page (https://developers.google.com/search/docs/appearance/structured-data/profile-page).
it('describes the page as a ProfilePage and links every social profile', async () => {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Cv)).window.document;

  const script = doc.querySelector('script[type="application/ld+json"]');
  assert.exists(script);
  expect(JSON.parse(script.textContent)['@type']).toBe('ProfilePage');
  expect([...doc.querySelectorAll('.social-links a')].map((link) => link.getAttribute('href'))).toEqual([
    SOCIAL_LINKS.github,
    SOCIAL_LINKS.linkedin,
    SOCIAL_LINKS.stackoverflow,
    SOCIAL_LINKS.instagram,
  ]);
});
