import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, assert } from 'vitest';
import Pill from './Pill.astro';

describe('Pill', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('renders a link with its label', async () => {
    const html = await container.renderToString(Pill, { props: { href: '/cv/' }, slots: { default: 'Full CV' } });
    const pill = new JSDOM(html).window.document.querySelector('a.pill');
    assert.exists(pill);
    expect(pill.getAttribute('href')).toBe('/cv/');
    expect(pill.textContent).toBe('Full CV');
    expect(pill.hasAttribute('aria-current')).toBe(false);
  });

  // The blog category filter marks the page the visitor is on (#299).
  it('marks the current page', async () => {
    const html = await container.renderToString(Pill, { props: { href: '/blog/', 'aria-current': 'page' }, slots: { default: 'All' } });
    const pill = new JSDOM(html).window.document.querySelector('a.pill');
    assert.exists(pill);
    expect(pill.getAttribute('aria-current')).toBe('page');
  });
});
