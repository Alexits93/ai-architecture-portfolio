import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { it, expect, assert } from 'vitest';
import Photos from '@/pages/_Photos.astro';

// The photo row is one named scroller that keyboard users can focus (#255), with the owner's five photos (#261), lazy
// below the fold. A named group, not a region landmark: Orca 51's next-landmark command loops on a landmark whose
// first content is an image (#304, #261).
it('renders the photo row as a focusable named group with five lazy photos that have alt text', async () => {
  const container = await AstroContainer.create();
  const doc = new JSDOM(await container.renderToString(Photos)).window.document;

  const photos = doc.querySelector('#photos[role="group"]');
  assert.exists(photos);
  expect([photos.getAttribute('aria-label'), photos.getAttribute('tabindex')]).toEqual(['Photos', '0']);
  const images = [...photos.querySelectorAll('ul > li > img')];
  expect(images).toHaveLength(5);
  for (const image of images) {
    expect(String(image.getAttribute('alt')).length).toBeGreaterThan(10);
    expect(image.getAttribute('loading')).toBe('lazy');
  }
  expect(photos.querySelector('[role="img"]')).toBeNull();
});
