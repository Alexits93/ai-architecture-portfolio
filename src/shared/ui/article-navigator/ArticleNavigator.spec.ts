import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach } from 'vitest';
import { ArticleNavigator } from './index';

describe('ArticleNavigator - With Headings', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render a nav element with heading links', async () => {
    const headings = [
      { depth: 2, slug: 'intro', text: 'Introduction' },
      { depth: 3, slug: 'sub-intro', text: 'Sub Introduction' },
      { depth: 2, slug: 'conclusion', text: 'Conclusion' }
    ];

    const html = await container.renderToString(ArticleNavigator, {
      props: { headings }
    });
    
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const navEl = doc.querySelector('nav.article-navigator');
    expect(navEl).not.toBeNull();

    const links = doc.querySelectorAll('nav.article-navigator a');
    expect(links.length).toBe(3);

    expect(links[0].getAttribute('href')).toBe('#intro');
    expect(links[0].textContent.trim()).toBe('Introduction');
    expect(links[0].classList.contains('h2-link')).toBe(true);

    expect(links[1].getAttribute('href')).toBe('#sub-intro');
    expect(links[1].textContent.trim()).toBe('Sub Introduction');
    expect(links[1].classList.contains('h3-link')).toBe(true);
  });
});

describe('ArticleNavigator - Empty Headings', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render correctly with empty headings', async () => {
    const html = await container.renderToString(ArticleNavigator, {
      props: { headings: [] }
    });
    
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const navEl = doc.querySelector('nav.article-navigator');
    expect(navEl).not.toBeNull();

    const links = doc.querySelectorAll('nav.article-navigator a');
    expect(links.length).toBe(0);
  });
});
