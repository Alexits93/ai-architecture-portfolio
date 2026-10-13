import { describe, it, expect } from 'vitest';
import { blogSchema, experienceSchema } from '@/content.config';

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
