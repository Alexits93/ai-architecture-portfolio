import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { it, expect, assert } from 'vitest';
import Photos from '@/pages/_Photos.astro';

// The photo row is one named scroller that keyboard users can focus, with a list of placeholder images (#255).
it('renders the photo row as a focusable named region with five placeholder images', async () => {
  const container = await AstroContainer.create();
  const doc = new JSDOM(await container.renderToString(Photos)).window.document;

  const photos = doc.querySelector('#photos[role="region"]');
  assert.exists(photos);
  expect([photos.getAttribute('aria-label'), photos.getAttribute('tabindex')]).toEqual(['Photos', '0']);
  const tiles = [...photos.querySelectorAll('ul > li > [role="img"]')];
  expect(tiles.map((tile) => tile.getAttribute('aria-label'))).toEqual([1, 2, 3, 4, 5].map((n) => `Photo placeholder ${n}`));
});
