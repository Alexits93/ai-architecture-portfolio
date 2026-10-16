import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, assert } from 'vitest';
import { createTestPost } from '../../tests/fixtures/post';
import BlogPostThumbnail from './BlogPostThumbnail.astro';

const mockPost = createTestPost({ id: 'test-post', category: 'Architecture' });

describe('BlogPostThumbnail Entity (Astro)', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  const render = async (heading: 'h2' | 'h3' = 'h2') => {
    const html = await container.renderToString(BlogPostThumbnail, { props: { post: mockPost, heading } });
    return new JSDOM(html).window.document;
  };

  it('renders title, description, and a slug permalink with trailing slash', async () => {
    const doc = await render();
    const [title, description, link] = [doc.querySelector('h2'), doc.querySelector('p:not(.eyebrow)'), doc.querySelector('a')];
    assert.exists(title);
    assert.exists(description);
    assert.exists(link);
    expect(title.textContent).toBe('Title test-post');
    expect(description.textContent).toBe('Description test-post');
    expect(link.getAttribute('href')).toBe('/blog/test-post/');
  });

  // The home design system: a raised card with the category as its kicker and a display title. The morph
  // script names the title.
  it('renders a raised card with the category kicker and a display title', async () => {
    const doc = await render();
    const card = doc.querySelector('a > article.card');
    assert.exists(card);
    const kicker = card.querySelector('.eyebrow');
    assert.exists(kicker);
    expect(kicker.textContent).toBe('Architecture');
    const title = card.querySelector('h2.display[data-size="card"][data-morph="title"]');
    assert.exists(title);
  });

  // Under the "Recommended articles" h2, the card titles are h3 (WCAG 1.3.1).
  it('renders the title at the heading level it is given', async () => {
    const doc = await render('h3');
    expect(doc.querySelector('h2')).toBeNull();
    expect(doc.querySelector('h3')).toHaveProperty('textContent', 'Title test-post');
  });

  // The card is one link, so the category is text, not a nested link.
  it('renders the category as text, and no arrow icon or image', async () => {
    const doc = await render();
    expect(doc.querySelectorAll('a')).toHaveLength(1);
    expect(doc.querySelector('svg, img, figure')).toBeNull();
  });
});

describe('BlogPostThumbnail link name', () => {
  // Regression: Firefox computes no name from content for a link that only wraps an <article>, so Orca read "link". The
  // title names the link and the description describes it.
  it('names the link by the title and describes it by the description', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(BlogPostThumbnail, { props: { post: mockPost, heading: 'h2' } });
    const doc = new JSDOM(html).window.document;
    const link = doc.querySelector('a');
    assert.exists(link);
    const byIds = (attribute: string) =>
      String(link.getAttribute(attribute)).split(' ').map((id) => doc.getElementById(id)).map((el) => el && el.textContent);
    expect(byIds('aria-labelledby')).toEqual(['Title test-post']);
    expect(byIds('aria-describedby')).toEqual(['Description test-post']);
  });
});

// A test article shows a Draft label next to its category, and the link description starts with it.
describe('BlogPostThumbnail draft label', () => {
  const render = async (draft: boolean) => {
    const container = await AstroContainer.create();
    const post = createTestPost({ id: 'test-post', draft });
    const html = await container.renderToString(BlogPostThumbnail, { props: { post, heading: 'h2' } });
    return new JSDOM(html).window.document;
  };

  it('labels a draft post and describes the link with the label', async () => {
    const doc = await render(true);
    const label = doc.querySelector('.card .draft-label');
    assert.exists(label);
    expect(label.textContent).toBe('Draft');
    const link = doc.querySelector('a');
    assert.exists(link);
    const described = String(link.getAttribute('aria-describedby')).split(' ').map((id) => doc.getElementById(id));
    expect(described.map((el) => el && el.textContent)).toEqual(['Draft', 'Description test-post']);
  });

  it('shows no label on a post that is not a draft', async () => {
    const doc = await render(false);
    expect(doc.querySelector('.draft-label')).toBeNull();
  });
});
