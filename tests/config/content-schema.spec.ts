import { describe, it, expect } from 'vitest';
import { blogSchema } from '@/content.config';

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
