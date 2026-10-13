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
    'Lead Frontend Architect & Engineer - Swiss Learning Hub',
    'Frontend Developer - IBM iX DACH',
    'Fullstack Developer - Solvistas GmbH',
    'Fullstack Developer - Voov Ltd.',
  ]);
});

// Owner-confirmed IBM iX DACH highlights; the #23 port had invented them. The exact text keeps the client and the shop unnamed (#215).
it('renders the owner-confirmed IBM iX DACH highlights', async () => {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Cv)).window.document;

  const ibm = doc.querySelectorAll('.experience-item')[1];
  assert.exists(ibm);
  expect([...ibm.querySelectorAll('.position p')].map((p) => p.textContent)).toEqual([
    'Led frontend development of a B2B webshop for licensed hair salon professionals, with more than 10 professional brands and about 1,500 products.',
    'Mentored junior frontend developers.',
  ]);
});

// Owner-written Swiss Learning Hub highlights (#215).
it('renders the owner-written Swiss Learning Hub highlights', async () => {
  const container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  const doc = new JSDOM(await container.renderToString(Cv)).window.document;

  const current = doc.querySelectorAll('.experience-item')[0];
  assert.exists(current);
  expect([...current.querySelectorAll('.position p')].map((p) => p.textContent)).toEqual([
    'Leading the frontend architecture and engineering of the Evento feature web migration, built with Nx and Angular.',
    'Mentoring juniors and leading the team with clear terminology, principles and high engineering standards.',
    'Among the people leading AI adoption at the company, engineering tailored user harnesses for LLM usage.',
  ]);
  expect([...current.querySelectorAll('.skill-tag')].map((tag) => tag.textContent)).toContain('#nx');
});
