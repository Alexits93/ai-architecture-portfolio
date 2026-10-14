import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, assert } from 'vitest';
import Eyebrow from './Eyebrow.astro';

describe('Eyebrow', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  const render = async (props: { slash?: boolean }) => {
    const html = await container.renderToString(Eyebrow, { props, slots: { default: 'Career' } });
    const eyebrow = new JSDOM(html).window.document.querySelector('p.eyebrow');
    assert.exists(eyebrow);
    return eyebrow;
  };

  // #286: screen readers speak the slash as "slash", so it shows but stays out of the accessible text.
  it('starts a section eyebrow with a slash hidden from assistive technology', async () => {
    const eyebrow = await render({});
    expect(eyebrow.textContent).toBe('/ Career');
    expect(eyebrow.querySelector('span[aria-hidden="true"]')).toHaveProperty('textContent', '/ ');
  });

  it('leaves the slash out of a card kicker', async () => {
    const eyebrow = await render({ slash: false });
    expect(eyebrow.textContent).toBe('Career');
    expect(eyebrow.querySelector('span')).toBeNull();
  });
});
