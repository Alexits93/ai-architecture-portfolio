import * as fs from 'fs';
import { describe, it, expect } from 'vitest';
import { blogSchema, experienceSchema, faqSchema, nowSchema, servicesSchema } from '@/content.config';

// One category per post, strict object: an unknown key such as the removed `tags` fails the build (#90).
const withoutCategory = {
  slug: 'a-post',
  title: 'Title',
  subtitle: 'Subtitle',
  description: 'Description',
  publishDate: '2026-10-11',
};
const frontmatter = { ...withoutCategory, category: 'AI' };

describe('blog collection schema', () => {
  it('accepts each category', () => {
    for (const category of ['AI', 'Architecture']) {
      expect(blogSchema.safeParse({ ...frontmatter, category }).success).toBe(true);
    }
  });

  it('rejects an unknown or missing category', () => {
    expect(blogSchema.safeParse({ ...frontmatter, category: 'Design' }).success).toBe(false);
    expect(blogSchema.safeParse(withoutCategory).success).toBe(false);
  });

  it('rejects a tags field', () => {
    expect(blogSchema.safeParse({ ...frontmatter, tags: ['AI'] }).success).toBe(false);
  });
});

// Experience entries feed /cv/ and later the home timeline from one YAML file (#215).
const withoutRole = {
  id: 'acme',
  start: 2020,
  end: 2023,
  company: 'Acme',
  highlights: ['Built the Angular app.'],
  emphasis: ['Angular'],
  skills: ['Angular'],
};
const entry = { ...withoutRole, role: 'Frontend Developer' };

describe('experience collection schema', () => {
  it('accepts an entry, and null as the end of the current one', () => {
    expect(experienceSchema.safeParse(entry).success).toBe(true);
    expect(experienceSchema.safeParse({ ...entry, end: null }).success).toBe(true);
  });

  it('rejects an entry without a role', () => {
    expect(experienceSchema.safeParse(withoutRole).success).toBe(false);
  });

  it('rejects an emphasis term that no highlight contains', () => {
    expect(experienceSchema.safeParse({ ...entry, emphasis: ['Vue.js'] }).success).toBe(false);
  });
});

// The now block on home: one Markdown file whose `updated` date shows next to the text (#218).
describe('now collection schema', () => {
  it('accepts an updated date', () => {
    expect(nowSchema.safeParse({ updated: '2026-10-13' }).success).toBe(true);
  });

  it('rejects a missing updated date or an unknown key', () => {
    expect(nowSchema.safeParse({}).success).toBe(false);
    expect(nowSchema.safeParse({ updated: '2026-10-13', title: 'Now' }).success).toBe(false);
  });

  it('keeps raw HTML out of the now text', () => {
    expect(fs.readFileSync('src/content/now/now.md', 'utf8')).not.toMatch(/<[a-z!/]/i);
  });
});

// The "What I do best" cards on home, one YAML entry per card, shown by `order` (#256).
const withoutTitle = {
  id: 'frontend-architecture',
  order: 1,
  kicker: 'Day job',
  text: 'I turn features into web applications.',
  tools: ['Angular'],
};
const service = { ...withoutTitle, title: 'Frontend architecture' };

describe('services collection schema', () => {
  it('accepts a service', () => {
    expect(servicesSchema.safeParse(service).success).toBe(true);
  });

  it('rejects a missing field, an unknown key, an empty tool list or a position below 1', () => {
    expect(servicesSchema.safeParse(withoutTitle).success).toBe(false);
    expect(servicesSchema.safeParse({ ...service, icon: 'star' }).success).toBe(false);
    expect(servicesSchema.safeParse({ ...service, tools: [] }).success).toBe(false);
    expect(servicesSchema.safeParse({ ...service, order: 0 }).success).toBe(false);
  });
});

// The FAQ on home, one YAML entry per question, shown by `order` (#259).
const withoutAnswer = { id: 'stack', order: 1, question: 'Which stack do you use?' };
const question = { ...withoutAnswer, answer: 'Astro and plain CSS.' };

describe('faq collection schema', () => {
  it('accepts a question', () => {
    expect(faqSchema.safeParse(question).success).toBe(true);
  });

  it('rejects a missing answer, an unknown key or a position below 1', () => {
    expect(faqSchema.safeParse(withoutAnswer).success).toBe(false);
    expect(faqSchema.safeParse({ ...question, open: true }).success).toBe(false);
    expect(faqSchema.safeParse({ ...question, order: 0 }).success).toBe(false);
  });
});
