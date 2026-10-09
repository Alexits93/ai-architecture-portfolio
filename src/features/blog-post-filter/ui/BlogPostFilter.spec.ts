import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach } from 'vitest';
import { BlogPostFilter } from '../index';

describe('BlogPostFilter - Initial Render', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render a list of native checkboxes', async () => {
    const tags = ['Astro', 'React', 'Svelte'];

    const html = await container.renderToString(BlogPostFilter, {
      props: { tags }
    });
    
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const formEl = doc.querySelector('form#filter-form');
    expect(formEl).not.toBeNull();

    const inputs = doc.querySelectorAll('input[type="checkbox"]');
    expect(inputs.length).toBe(3);

    // Verify first tag
    expect(inputs[0].getAttribute('value')).toBe('Astro');
    expect(inputs[0]).toHaveProperty('checked', false);
    expect(inputs[0].hasAttribute('checked')).toBe(false);
  });
});

describe('BlogPostFilter - With Selected Tags', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should mark inputs as checked if they are in selectedTags', async () => {
    const tags = ['Astro', 'React', 'Svelte'];
    const selectedTags = ['React'];

    const html = await container.renderToString(BlogPostFilter, {
      props: { tags, selectedTags }
    });
    
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const inputs = doc.querySelectorAll('input[type="checkbox"]');
    
    // Astro should not be checked
    expect(inputs[0].hasAttribute('checked')).toBe(false);

    // React should be checked
    expect(inputs[1].hasAttribute('checked')).toBe(true);
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

    const inputs = doc.querySelectorAll('input[type="checkbox"]');
    expect(inputs.length).toBe(0);
  });
});
