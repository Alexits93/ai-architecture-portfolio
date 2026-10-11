import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { CollectionEntry } from 'astro:content';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, vi, assert } from 'vitest';
import MockContent from '../__mocks__/MockContent.astro';
import BlogPostReader from './BlogPostReader.astro';

const mockPost: CollectionEntry<'blog'> = {
  id: 'test-post',
  collection: 'blog',
  data: {
    title: 'Test Post Title',
    subtitle: 'Test Subtitle',
    description: 'A test description for the blog post.',
    publishDate: new Date('2026-09-14T00:00:00.000Z'),
    tags: ['astro', 'typescript'],
    slug: 'test-post',
    isFeatured: false,
  },
  body: '## Mock Heading\n\nMock body content',
};

vi.mock('astro:content', async (importOriginal) => {
  const actual = await importOriginal<typeof import('astro:content')>();
  return {
    ...actual,
    render: async () => ({
      Content: MockContent,
      headings: [{ depth: 2, slug: 'mock-heading', text: 'Mock Heading' }],
      remarkPluginFrontmatter: {},
    }),
  };
});

describe('BlogPostReader Widget (Astro)', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render the blog post metadata (title, subtitle, dates)', async () => {
    const html = await container.renderToString(BlogPostReader, {
      props: { post: mockPost },
    });
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const title = doc.querySelector('h1');
    assert.exists(title);
    expect(title.textContent).toBe('Test Post Title');

    const subtitle = doc.querySelector('h2');
    assert.exists(subtitle);
    expect(subtitle.textContent).toBe('Test Subtitle');

    // Should format date
    const htmlContent = doc.body.innerHTML;
    expect(htmlContent).toContain('14 SEP 2026');
  });

  it('should render the tags via SkillTag', async () => {
    const html = await container.renderToString(BlogPostReader, {
      props: { post: mockPost },
    });
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Check if skill tags are rendered
    const tags = doc.querySelectorAll('span.skill-tag');
    expect(tags.length).toBe(2);
    expect(tags[0].textContent.trim()).toBe('#astro');
    expect(tags[1].textContent.trim()).toBe('#typescript');
  });
});

describe('BlogPostReader Widget (Astro) - Secondary Elements', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render the article navigator', async () => {
    const html = await container.renderToString(BlogPostReader, {
      props: { post: mockPost },
    });
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const navigator = doc.querySelector('nav.article-navigator');
    expect(navigator).not.toBeNull();
  });
});
