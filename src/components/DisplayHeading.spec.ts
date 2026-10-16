import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, assert } from 'vitest';
import DisplayHeading from './DisplayHeading.astro';

describe('DisplayHeading', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  type Props = { as: 'h1' | 'h2' | 'h3'; size: 'section' | 'card'; text?: string; accent?: string; id?: string; class?: string };

  const render = async (props: Props) => {
    const html = await container.renderToString(DisplayHeading, { props });
    const heading = new JSDOM(html).window.document.querySelector('.display');
    assert.exists(heading);
    return heading;
  };

  it('renders the words, then the accent words in a gradient span', async () => {
    const heading = await render({ as: 'h2', size: 'section', id: 'work-title', text: 'Work', accent: 'experience' });
    expect(heading.tagName).toBe('H2');
    expect(heading.id).toBe('work-title');
    expect(heading.getAttribute('data-size')).toBe('section');
    expect(heading.textContent).toBe('Work experience');
    expect(heading.querySelector('.accent')).toHaveProperty('textContent', 'experience');
  });

  it('renders an accent-only heading without a leading space', async () => {
    const heading = await render({ as: 'h2', size: 'card', accent: 'Now' });
    expect(heading.textContent).toBe('Now');
  });

  // A page title, such as the blog index.
  it('renders a page title as an h1', async () => {
    const heading = await render({ as: 'h1', size: 'section', text: 'All', accent: 'posts' });
    expect(heading.tagName).toBe('H1');
    expect(heading.textContent).toBe('All posts');
  });

  it('renders plain words at card size as an h3 that keeps the class it is given', async () => {
    const heading = await render({ as: 'h3', size: 'card', text: '01. Title', class: 'name' });
    expect(heading.tagName).toBe('H3');
    expect(heading.classList.contains('name')).toBe(true);
    expect(heading.textContent).toBe('01. Title');
    expect(heading.querySelector('.accent')).toBeNull();
  });
});
