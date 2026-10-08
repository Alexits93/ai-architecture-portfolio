import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach } from 'vitest';
import { BlogPostFilter } from '../index';

describe('BlogPostFilter - Initial Render', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render a list of interactive skill tags', async () => {
    const tags = ['Astro', 'React', 'Svelte'];

    const html = await container.renderToString(BlogPostFilter, {
      props: { tags }
    });
    
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const filterEl = doc.querySelector('blog-post-filter');
    expect(filterEl).not.toBeNull();
    expect(filterEl?.getAttribute('data-selected')).toBe('[]');

    const buttons = doc.querySelectorAll('button.skill-tag.interactive');
    expect(buttons.length).toBe(3);

    // Verify first tag
    expect(buttons[0].getAttribute('data-skill')).toBe('Astro');
    expect(buttons[0].textContent?.trim()).toBe('Astro');
    expect(buttons[0].classList.contains('active')).toBe(false);
  });
});

describe('BlogPostFilter - With Selected Tags', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should mark tags as active if they are in selectedTags', async () => {
    const tags = ['Astro', 'React', 'Svelte'];
    const selectedTags = ['React'];

    const html = await container.renderToString(BlogPostFilter, {
      props: { tags, selectedTags }
    });
    
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const filterEl = doc.querySelector('blog-post-filter');
    expect(filterEl?.getAttribute('data-selected')).toBe(JSON.stringify(['React']));

    const buttons = doc.querySelectorAll('button.skill-tag.interactive');
    
    // Astro should not be active
    expect(buttons[0].classList.contains('active')).toBe(false);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');

    // React should be active
    expect(buttons[1].classList.contains('active')).toBe(true);
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
  });
});

describe('BlogPostFilter - Empty Props', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should handle empty props gracefully', async () => {
    const html = await container.renderToString(BlogPostFilter);
    
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const filterEl = doc.querySelector('blog-post-filter');
    expect(filterEl).not.toBeNull();
    expect(filterEl?.getAttribute('data-selected')).toBe('[]');

    const buttons = doc.querySelectorAll('button.skill-tag');
    expect(buttons.length).toBe(0);
  });
});
