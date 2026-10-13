import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { CollectionEntry } from 'astro:content';
import { JSDOM } from 'jsdom';
import { it, expect, assert, vi } from 'vitest';
import Cv from '@/pages/cv.astro';
import { SITE } from '@/consts';

// Vitest has no collection data, so the experience entry is a fixture (#226).
// e2e/cv-experience.spec.ts checks the real entries on the built page.
const entry: CollectionEntry<'experience'> = {
  id: 'acme',
  collection: 'experience',
  data: { id: 'acme', start: 2020, end: null, role: 'Role', company: 'Acme', highlights: ['Built it.'], emphasis: [], skills: ['TypeScript'] },
};

vi.mock('astro:content', () => ({ getCollection: async () => [entry] }));

// /cv/ shows the same site-wide title as the home hero (#214).
it('renders SITE.role in the CV hero', async () => {
  // The page renders SeoHead through BaseLayout, which needs `site` for absolute URLs.
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Cv)).window.document;

  const role = doc.querySelector('#about-me h2');
  assert.exists(role);
  expect(role.textContent).toBe(SITE.role);
});

it('renders the experience list from the collection', async () => {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Cv)).window.document;

  expect([...doc.querySelectorAll('.experience-item h3')].map((h3) => h3.textContent)).toEqual(['Role - Acme']);
});
