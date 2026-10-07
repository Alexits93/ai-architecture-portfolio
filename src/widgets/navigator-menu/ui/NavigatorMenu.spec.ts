import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach } from 'vitest';
import NavigatorMenu from './NavigatorMenu.astro';

describe('NavigatorMenu Widget (Astro)', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render the navigator menu container in a closed state by default', async () => {
    const html = await container.renderToString(NavigatorMenu);
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const navMenu = doc.querySelector('#navigator-menu');
    expect(navMenu).not.toBeNull();
    // Should not have the "open" class by default
    expect(navMenu?.classList.contains('open')).toBe(false);
  });

  it('should render the default navigation links', async () => {
    const html = await container.renderToString(NavigatorMenu);
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const links = doc.querySelectorAll('#navigator-menu .navigator-menu-body ul li a');
    expect(links.length).toBeGreaterThan(0);
    
    // Check if the home link exists
    const homeLink = Array.from(links).find(link => link.getAttribute('href') === '/');
    expect(homeLink).not.toBeUndefined();
    expect(homeLink?.textContent?.trim()).toBe('Home');
  });
});
