import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach } from 'vitest';
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
    expect(homeLink).not.toBeNull();
    
    const srOnlySpan = homeLink?.querySelector('.sr-only');
    expect(srOnlySpan?.textContent).toBe('Back to Home page');
    
    const svg = homeLink?.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  // APG button pattern: a toggle keeps its label and exposes its state with aria-pressed.
  it('should render the theme toggle as a not-pressed "Dark theme" toggle button', async () => {
    const html = await container.renderToString(Header);
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const themeBtn = doc.querySelector('button.theme-toggle');
    expect(themeBtn?.getAttribute('aria-label')).toBe('Dark theme');
    expect(themeBtn?.getAttribute('aria-pressed')).toBe('false');

    const img = themeBtn?.querySelector('img.icon');
    expect(img?.getAttribute('alt')).toBe('');
  });

  it('should render the menu toggle button', async () => {
    const html = await container.renderToString(Header);
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const menuBtn = doc.querySelector('button#site-menu-open-btn');
    expect(menuBtn).not.toBeNull();
    
  });
});
