import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { CollectionEntry } from 'astro:content';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, vi, assert } from 'vitest';
import MockContent from './fixtures/MockContent.astro';
import BlogPostReader from '@/pages/blog/_BlogPostReader.astro';

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
    draft: false,
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

    // A display h1 with its subtitle as a paragraph in one hgroup, not a second heading.
    const title = doc.querySelector('#post-hero hgroup h1.display[data-size="section"][data-morph="title"]');
    assert.exists(title);
    expect(title.textContent).toBe('Test Post Title');
    expect(doc.querySelector('#post-hero h2')).toBeNull();

    const subtitle = doc.querySelector('#post-hero hgroup p.subtitle');
    assert.exists(subtitle);
    expect(subtitle.textContent).toBe('Test Subtitle');

    const date = doc.querySelector('#post-hero time');
    assert.exists(date);
    expect([date.getAttribute('datetime'), date.textContent]).toEqual(['2026-09-14', '14 Sept 2026']);
  });

  it('renders no image in the post header', async () => {
    const html = await container.renderToString(BlogPostReader, { props: { post: mockPost } });
    const header = new JSDOM(html).window.document.querySelector('#post-hero');
    assert.exists(header);
    expect(header.querySelector('img, figure')).toBeNull();
  });

  // The category is the eyebrow over the title and links to its category page.
  it('should link the category to its category page', async () => {
    const html = await container.renderToString(BlogPostReader, {
      props: { post: mockPost },
    });
    const doc = new JSDOM(html).window.document;

    const links = doc.querySelectorAll('a[href^="/blog/category/"]');
    expect(links).toHaveLength(1);
    const link = links.item(0);
    expect(link.closest('#post-hero hgroup .eyebrow')).not.toBeNull();
    expect(link.getAttribute('href')).toBe('/blog/category/ai/');
    expect(link.textContent).toBe('AI');
  });
});

// a test article shows a Draft label next to its category; a real post shows none.
describe('BlogPostReader draft label', () => {
  it('labels a draft post next to its category', async () => {
    const container = await AstroContainer.create();
    const draft = { ...mockPost, data: { ...mockPost.data, draft: true } };
    const doc = new JSDOM(await container.renderToString(BlogPostReader, { props: { post: draft } })).window.document;
    const label = doc.querySelector('#post-hero hgroup .eyebrow .draft-label');
    assert.exists(label);
    expect(label.textContent).toBe('Draft');

    const real = new JSDOM(await container.renderToString(BlogPostReader, { props: { post: mockPost } })).window.document;
    expect(real.querySelector('.draft-label')).toBeNull();
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

  // The table of contents is one named nav; its wrapper is no unnamed complementary landmark.
  it('names the table of contents and adds no unnamed aside', async () => {
    const doc = new JSDOM(await container.renderToString(BlogPostReader, { props: { post: mockPost } })).window.document;
    const navigator = doc.querySelector('nav.article-navigator');
    assert.exists(navigator);
    expect(navigator.getAttribute('aria-label')).toBe('On this page');
    expect(doc.querySelectorAll('aside')).toHaveLength(0);
  });

  // Same logo asset as the header, 40px high at the viewBox aspect ratio.
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
    // Decoration next to the author's name, as in the header.
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });
});
