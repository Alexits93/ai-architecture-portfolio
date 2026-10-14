import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, assert } from 'vitest';
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
    
    const navMenu = doc.querySelector('dialog#site-menu');
    assert.exists(navMenu);
    // Should not have the "open" attribute by default
    expect(navMenu.hasAttribute('open')).toBe(false);
  });

  it('should render the default navigation links', async () => {
    const html = await container.renderToString(NavigatorMenu);
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const links = doc.querySelectorAll('dialog#site-menu .navigator-menu-body ul li a');
    expect(links.length).toBeGreaterThan(0);
    
    // Check if the home link exists
    const homeLink = Array.from(links).find((link: Element) => link.getAttribute('href') === '/');
    assert.exists(homeLink);
    expect(homeLink.textContent.trim()).toBe('Home');
  });

  // The links are navigation, not headings: an h2 in each made the open menu announce three headings and put them
  // before every page's h1 (#282).
  it('renders the menu links without headings', async () => {
    const doc = new JSDOM(await container.renderToString(NavigatorMenu)).window.document;
    expect(doc.querySelectorAll('dialog#site-menu h1, dialog#site-menu h2, dialog#site-menu h3')).toHaveLength(0);
  });

  // Invoker command: the close button closes the dialog, no inline position (#157).
  it('should render the close button as a close command', async () => {
    const html = await container.renderToString(NavigatorMenu);
    const doc = new JSDOM(html).window.document;
    const closeBtn = doc.querySelector('dialog#site-menu button');
    assert.exists(closeBtn);
    expect(['aria-label', 'commandfor', 'command', 'style'].map((name) => closeBtn.getAttribute(name))).toEqual(
      ['Close menu', 'site-menu', 'close', null],
    );
  });
});
