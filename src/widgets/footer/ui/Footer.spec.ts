import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach } from 'vitest';
import Footer from './Footer.astro';

describe('Footer Widget (Astro)', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render the footer with dynamic year and correct links', async () => {
    const html = await container.renderToString(Footer);
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const footer = doc.querySelector('[data-testid="app-footer"]');
    expect(footer).not.toBeNull();
    
    // Check year and name
    const currentYear = new Date().getFullYear().toString();
    expect(footer?.textContent).toContain(currentYear);
    expect(footer?.textContent).toContain('Patrik Alexits');

    // Check framework link
    const frameworkLink = doc.querySelector('[data-testid="framework-link"]');
    expect(frameworkLink?.getAttribute('href')).toBe('https://astro.build/');
    expect(frameworkLink?.textContent).toBe('Astro');

    // Check policy links
    const cookieLink = doc.querySelector('[data-testid="cookie-link"]');
    expect(cookieLink?.getAttribute('href')).toBe('/cookie-disclaimer/');
    
    const privacyLink = doc.querySelector('[data-testid="privacy-link"]');
    expect(privacyLink?.getAttribute('href')).toBe('/privacy-policy/');
  });
});
