import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach } from 'vitest';
import CookieDisclaimer from './CookieDisclaimer.astro';

describe('CookieDisclaimer Widget (Astro)', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render the cookie disclaimer heading', async () => {
    const html = await container.renderToString(CookieDisclaimer);
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const heading = doc.querySelector('h1');
    expect(heading).not.toBeNull();
    expect(heading?.textContent?.trim()).toBe('Cookie Disclaimer');
  });

  it('should render the privacy policy link correctly', async () => {
    const html = await container.renderToString(CookieDisclaimer);
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const link = doc.querySelector('a[href="/privacy-policy"]');
    expect(link).not.toBeNull();
    expect(link?.textContent?.trim()).toContain('Privacy Policy');
  });
});
