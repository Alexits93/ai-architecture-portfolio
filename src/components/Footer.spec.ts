import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, assert } from 'vitest';
import Footer from './Footer.astro';
import { ROUTES, SITE } from '@/consts';

describe('Footer Widget (Astro)', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render the footer with dynamic year and correct links', async () => {
    const html = await container.renderToString(Footer);
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const footer = doc.querySelector('.app-footer');
    assert.exists(footer);
    
    // Check year and name
    const currentYear = new Date().getFullYear().toString();
    expect(footer.textContent).toContain(currentYear);
    expect(footer.textContent).toContain('Patrik Alexits');

    // Check framework link
    const frameworkLink = doc.querySelector('a[href="https://astro.build/"]');
    assert.exists(frameworkLink);
    expect(frameworkLink.textContent).toBe('Astro');

    // Check policy links
    const cookieLink = doc.querySelector(`a[href="${ROUTES.cookieDisclaimer}"]`);
    expect(cookieLink).not.toBeNull();
    
    const privacyLink = doc.querySelector(`a[href="${ROUTES.privacyPolicy}"]`);
    expect(privacyLink).not.toBeNull();

    // Every page offers the contact email.
    const emailLink = doc.querySelector(`a[href="mailto:${SITE.email}"]`);
    assert.exists(emailLink);
    expect(emailLink.textContent).toBe(SITE.email);
  });
});
