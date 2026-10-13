import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { getCollection, type CollectionEntry } from 'astro:content';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, vi, assert } from 'vitest';
import ExperienceList from './ExperienceList.astro';

vi.mock('astro:content', () => ({ getCollection: vi.fn() }));

const createEntry = (id: string, start: number, end: number | null): CollectionEntry<'experience'> => ({
  id,
  collection: 'experience',
  data: {
    id,
    start,
    end,
    role: `Role ${id}`,
    company: `Company ${id}`,
    highlights: [`Built ${id} with Angular.`, 'Second highlight.'],
    emphasis: ['Angular'],
    skills: ['Angular', 'TypeScript'],
  },
});

describe('ExperienceList Widget (Astro)', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    vi.clearAllMocks();
    container = await AstroContainer.create();
  });

  const render = async (entries: CollectionEntry<'experience'>[]) => {
    vi.mocked(getCollection).mockResolvedValueOnce(entries);
    return new JSDOM(await container.renderToString(ExperienceList)).window.document;
  };

  it('renders one item per entry, newest first', async () => {
    const doc = await render([createEntry('old', 2017, 2018), createEntry('new', 2024, null)]);
    expect(getCollection).toHaveBeenCalledWith('experience');
    const texts = (selector: string) => [...doc.querySelectorAll(selector)].map((el) => el.textContent);
    expect(texts('.experience-list-container .experience-item > span')).toEqual(['2024 - Present', '2017 - 2018']);
    expect(texts('.experience-item .position h3')).toEqual(['Role new - Company new', 'Role old - Company old']);
  });

  it('renders highlights as text with the emphasis terms in strong', async () => {
    const doc = await render([createEntry('a', 2020, 2023)]);
    const paragraphs = [...doc.querySelectorAll('.position p')];
    expect(paragraphs.map((p) => p.textContent)).toEqual(['Built a with Angular.', 'Second highlight.']);
    expect([...doc.querySelectorAll('.position p strong')].map((s) => s.textContent)).toEqual(['Angular']);
  });

  it('renders one skill tag per skill', async () => {
    const doc = await render([createEntry('a', 2020, 2023)]);
    const tags = doc.querySelector('.position .tags');
    assert.exists(tags);
    expect(tags.querySelectorAll('.skill-tag')).toHaveLength(2);
  });
});
