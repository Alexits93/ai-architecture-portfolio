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
    category: 'AI',
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

  it('should link the category to its category page', async () => {
    const html = await container.renderToString(BlogPostReader, {
      props: { post: mockPost },
    });
    const doc = new JSDOM(html).window.document;

    const tags = doc.querySelectorAll('span.skill-tag');
    expect(tags).toHaveLength(1);
    const link = tags.item(0).closest('a');
    assert.exists(link);
    expect(link.getAttribute('href')).toBe('/blog/category/ai/');
    expect(link.textContent.trim()).toBe('#ai');
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

  // Same logo asset as the header, 40px high at the viewBox aspect ratio (#119).
  it('should render the logo next to the author name', async () => {
    const html = await container.renderToString(BlogPostReader, {
      props: { post: mockPost },
    });
    const doc = new JSDOM(html).window.document;

    const svg = doc.querySelector('.author-info svg');
    assert.exists(svg);
    expect(['viewBox', 'fill', 'width', 'height'].map((name) => svg.getAttribute(name))).toEqual(
      ['0 0 467.68 294.45', 'currentColor', '63.54', '40'],
    );
  });
});
