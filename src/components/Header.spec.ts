import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, assert } from 'vitest';
import Header from './Header.astro';

describe('Header Widget (Astro)', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render the primary logo linked to the home route', async () => {
    const html = await container.renderToString(Header);
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const homeLink = doc.querySelector('a[href="/"]');
    assert.exists(homeLink);
    
    const srOnlySpan = homeLink.querySelector('.sr-only');
    assert.exists(srOnlySpan);
    expect(srOnlySpan.textContent).toBe('Back to Home page');
    
    const svg = homeLink.querySelector('svg');
    assert.exists(svg);
    // Explicit size keeps CLS at 0: 50px high at the viewBox aspect ratio.
    expect(['viewBox', 'fill', 'aria-hidden', 'width', 'height'].map((name) => svg.getAttribute(name))).toEqual(
      ['0 0 467.68 294.45', 'currentColor', 'true', '79.42', '50'],
    );
  });

  // APG button pattern: a toggle keeps its label and exposes its state with aria-pressed.
  it('should render the theme toggle as a not-pressed "Dark theme" toggle button', async () => {
    const html = await container.renderToString(Header);
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const themeBtn = doc.querySelector('button.theme-toggle');
    assert.exists(themeBtn);
    expect(themeBtn.getAttribute('aria-label')).toBe('Dark theme');
    expect(themeBtn.getAttribute('aria-pressed')).toBe('false');
  });

  // Invoker command: the button opens the menu dialog without a script.
  it('should render the menu button as a show-modal command for the site menu', async () => {
    const doc = new JSDOM(await container.renderToString(Header)).window.document;
    const menuBtn = doc.querySelector('button.navigator-menu-opener');
    assert.exists(menuBtn);
    expect(['aria-label', 'commandfor', 'command', 'id'].map((name) => menuBtn.getAttribute(name))).toEqual(
      ['Open menu', 'site-menu', 'show-modal', null],
    );
  });
});

// Inline icons take the theme colour through currentColor; no image request.
it('should render the theme toggle icons inline with currentColor', async () => {
  const container = await AstroContainer.create();
  const doc = new JSDOM(await container.renderToString(Header)).window.document;
  const themeBtn = doc.querySelector('button.theme-toggle');
  assert.exists(themeBtn);

  expect(themeBtn.querySelector('img')).toBeNull();
  const icons = [...themeBtn.querySelectorAll('svg')].map((svg) =>
    ['class', 'viewBox', 'fill', 'aria-hidden', 'width', 'height'].map((name) => svg.getAttribute(name)),
  );
  expect(icons).toEqual([
    ['icon moon', '0 -960 960 960', 'currentColor', 'true', '50', '50'],
    ['icon sun', '0 -960 960 960', 'currentColor', 'true', '50', '50'],
  ]);
});
