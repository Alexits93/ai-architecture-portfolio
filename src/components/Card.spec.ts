import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, assert } from 'vitest';
import Card from './Card.astro';

describe('Card', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  // The page passes its own class and attributes, so its scoped styles lay out the card (https://docs.astro.build/en/guides/styling/).
  it('renders its content in the element it is given, with the class and attributes it is given', async () => {
    const html = await container.renderToString(Card, {
      props: { as: 'section', id: 'now', class: 'now', 'aria-labelledby': 'now-title' },
      slots: { default: '<p>Body</p>' },
    });
    const card = new JSDOM(html).window.document.querySelector('.card');
    assert.exists(card);
    expect(card.tagName).toBe('SECTION');
    expect(card.classList.contains('now')).toBe(true);
    expect(card.id).toBe('now');
    expect(card.getAttribute('aria-labelledby')).toBe('now-title');
    expect(card.innerHTML).toContain('<p>Body</p>');
  });
});
