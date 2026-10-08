import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach } from 'vitest';
import PrivacyPolicy from './PrivacyPolicy.astro';

describe('PrivacyPolicy Widget (Astro)', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render the privacy policy heading', async () => {
    const html = await container.renderToString(PrivacyPolicy);
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const heading = doc.querySelector('h1');
    expect(heading).not.toBeNull();
    expect(heading?.textContent?.trim()).toBe('Privacy Policy');
  });

  it('should render the contact email correctly', async () => {
    const html = await container.renderToString(PrivacyPolicy);
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const p = Array.from(doc.querySelectorAll('p')).find(p => p.textContent?.includes('pa-tech@gmail.com'));
    expect(p).not.toBeUndefined();
  });
});
