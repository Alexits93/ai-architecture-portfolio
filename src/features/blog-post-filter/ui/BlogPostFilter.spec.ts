import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, assert } from 'vitest';
import { BlogPostFilter } from '../index';

describe('BlogPostFilter', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  // The filter runs in the browser only; a static site never reads a submitted query, so there is no form.
  it('groups native checkboxes in a labelled fieldset without a form', async () => {
    const html = await container.renderToString(BlogPostFilter, {
      props: { tags: ['Astro', 'React', 'Svelte'] },
    });
    const doc = new JSDOM(html).window.document;

    expect(doc.querySelector('form')).toBeNull();
    expect(doc.querySelector('button')).toBeNull();
    const el = doc.querySelector('fieldset > legend');
    assert.exists(el);
    expect(el.textContent).toBe('Filter by tag');

    const inputs = doc.querySelectorAll('fieldset input[type="checkbox"][name="tag"]');
    expect([...inputs].map((input) => input.getAttribute('value'))).toEqual(['Astro', 'React', 'Svelte']);
    expect(inputs[0].hasAttribute('checked')).toBe(false);
  });

  it('should handle empty props gracefully', async () => {
    const html = await container.renderToString(BlogPostFilter);
    const doc = new JSDOM(html).window.document;

    expect(doc.querySelectorAll('input[type="checkbox"]').length).toBe(0);
  });
});
