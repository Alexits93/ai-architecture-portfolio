import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { it, expect, assert } from 'vitest';
import Cv from '@/pages/cv.astro';
import { SITE } from '@/shared/config';

// /cv/ shows the same site-wide title as the home hero (#214).
it('renders SITE.role in the CV hero', async () => {
  // The page renders SeoHead through BaseLayout, which needs `site` for absolute URLs.
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Cv)).window.document;

  const role = doc.querySelector('#about-me h2');
  assert.exists(role);
  expect(role.textContent).toBe(SITE.role);
});

// /cv/ renders the positions from src/content/experience.yaml, newest first (#215).
it('renders the experience collection newest first', async () => {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Cv)).window.document;

  const texts = (selector: string) => [...doc.querySelectorAll(selector)].map((el) => el.textContent);
  expect(texts('.experience-item > span')).toEqual(['2024 - Present', '2020 - 2023', '2019 - 2020', '2017 - 2018']);
  expect(texts('.experience-item h3')).toEqual([
    'Frontend Software Engineer - Swiss Learning Hub',
    'Frontend Developer - Avensys Consulting',
    'Fullstack Developer - Solvistas GmbH',
    'Fullstack Developer - Voov Ltd.',
  ]);
});
