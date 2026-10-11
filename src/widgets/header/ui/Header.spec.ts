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
    expect(svg).not.toBeNull();
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

  it('should render the menu toggle button', async () => {
    const html = await container.renderToString(Header);
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const menuBtn = doc.querySelector('button#site-menu-open-btn');
    expect(menuBtn).not.toBeNull();
    
  });
});

// Inline icons take the theme colour through currentColor; no image request (#88).
it('should render the theme toggle icons inline with currentColor', async () => {
  const container = await AstroContainer.create();
  const doc = new JSDOM(await container.renderToString(Header)).window.document;
  const themeBtn = doc.querySelector('button.theme-toggle');
  assert.exists(themeBtn);

  expect(themeBtn.querySelector('img')).toBeNull();
  const icons = [...themeBtn.querySelectorAll('svg')].map((svg) =>
    ['class', 'fill', 'aria-hidden', 'width', 'height'].map((name) => svg.getAttribute(name)),
  );
  expect(icons).toEqual([
    ['icon moon', 'currentColor', 'true', '50', '50'],
    ['icon sun', 'currentColor', 'true', '50', '50'],
  ]);
});
