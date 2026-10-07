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
    console.log("Header object:", Header);
    console.log("Header keys:", Object.keys(Header));
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

  it('should render a theme toggle button with appropriate attributes', async () => {
    const html = await container.renderToString(Header);
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const themeBtn = doc.querySelector('button.theme-toggle');
    expect(themeBtn).not.toBeNull();
    
    const img = themeBtn?.querySelector('img.icon');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('alt')).toContain('mode icon');
  });

  it('should render the menu toggle button', async () => {
    const html = await container.renderToString(Header);
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const menuBtn = doc.querySelector('button.menu-toggle');
    expect(menuBtn).not.toBeNull();
    expect(menuBtn?.getAttribute('aria-expanded')).toBe('false');
  });
});
