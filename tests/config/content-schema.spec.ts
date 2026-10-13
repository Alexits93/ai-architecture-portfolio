import * as fs from 'fs';
import { describe, it, expect } from 'vitest';
import { blogSchema, experienceSchema, nowSchema, projectSchema } from '@/content.config';

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

// The projects block on home: one YAML file, ordered by `order` because collection order is not guaranteed (#217).
const project = {
  id: 'acme-app',
  order: 1,
  name: 'Acme app',
  description: 'A web app.',
  role: 'Lead',
  stack: ['Angular'],
  outcome: 'Faster releases.',
};

describe('projects collection schema', () => {
  it('accepts a project with or without a public link', () => {
    expect(projectSchema.safeParse(project).success).toBe(true);
    expect(projectSchema.safeParse({ ...project, url: 'https://github.com/acme/app' }).success).toBe(true);
  });

  it('rejects a link that is not a URL, a missing outcome or an unknown key', () => {
    expect(projectSchema.safeParse({ ...project, url: 'github.com/acme' }).success).toBe(false);
    expect(projectSchema.safeParse({ ...project, outcome: undefined }).success).toBe(false);
    expect(projectSchema.safeParse({ ...project, image: 'x.png' }).success).toBe(false);
  });
});
