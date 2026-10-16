import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { it, expect, assert } from 'vitest';
import Photos from '@/pages/_Photos.astro';

const render = async () => {
  const container = await AstroContainer.create();
  return new JSDOM(await container.renderToString(Photos)).window.document;
};

// The photo row is one named scroller that keyboard users can focus, with the owner's five photos, lazy
// below the fold. A named group, not a region landmark: Orca 51's next-landmark command loops on a landmark whose
// first content is an image.
it('renders the photo row as a focusable named group with five lazy photos that have alt text', async () => {
  const doc = await render();

  const photos = doc.querySelector('#photos[role="group"]');
  assert.exists(photos);
  expect([photos.getAttribute('aria-label'), photos.getAttribute('tabindex')]).toEqual(['Photos', '0']);
  const images = [...photos.querySelectorAll('ul > li > button > img')];
  expect(images).toHaveLength(5);
  for (const image of images) {
    expect(String(image.getAttribute('alt')).length).toBeGreaterThan(10);
    expect(image.getAttribute('loading')).toBe('lazy');
  }
  expect(photos.querySelector('[role="img"]')).toBeNull();
});

// Each photo is a button that opens its own dialog through an invoker command, no script needed. The dialog
// shows the photo larger with its alt text as the caption, which names the dialog, and a close button.
it('opens each photo in a dialog named by its caption, with a close button', async () => {
  const doc = await render();

  for (const button of doc.querySelectorAll('#photos ul > li > button')) {
    const image = button.querySelector('img');
    assert.exists(image);
    const alt = String(image.getAttribute('alt'));
    expect([button.getAttribute('type'), button.getAttribute('command')]).toEqual(['button', 'show-modal']);

    const dialog = doc.getElementById(String(button.getAttribute('commandfor')));
    assert.exists(dialog);
    expect([dialog.tagName, dialog.getAttribute('closedby')]).toEqual(['DIALOG', 'any']);
    const caption = dialog.querySelector('figure > figcaption');
    assert.exists(caption);
    expect(caption.textContent).toBe(alt);
    expect(dialog.getAttribute('aria-labelledby')).toBe(caption.id);
    const large = dialog.querySelector('figure > img');
    assert.exists(large);
    expect([large.getAttribute('alt'), large.getAttribute('loading')]).toEqual(['', 'lazy']);

    const close = dialog.querySelector('button');
    assert.exists(close);
    expect([close.getAttribute('commandfor'), close.getAttribute('command'), close.getAttribute('aria-label')]).toEqual([
      dialog.id,
      'close',
      'Close photo',
    ]);
  }
});
