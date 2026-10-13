import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, assert } from 'vitest';
import Index from '@/pages/index.astro';
import { SITE } from '@/shared/config';

describe('Home Page (index.astro)', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    // The page renders SeoHead through BaseLayout, which needs `site` for absolute URLs.
    container = await AstroContainer.create({ astroConfig: { site: 'https://www.pa-tech.dev' } });
  });

  it('should render the layout with AboutMe and stubbed widgets', async () => {
    const html = await container.renderToString(Index);
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const main = doc.querySelector('main');
    expect(main).not.toBeNull();

    // Two grid columns from 64rem: the hero, then the blocks (#214).
    const wrapper = doc.querySelector('.home-wrapper');
    assert.exists(wrapper);
    expect([...wrapper.children].map((child) => child.matches('section#about-me, .home-blocks'))).toEqual([true, true]);

    // Check for BlogPostFeatured Stub
    const blogFeatured = doc.querySelector('.home-blocks section#blog-featured');
    expect(blogFeatured).not.toBeNull();

    // Check for BlogPostRecommended Stub
    const blogRecommended = doc.querySelector('.home-blocks section#blog-section');
    expect(blogRecommended).not.toBeNull();
  });

  // One site-wide title and the positioning pitch from SITE (#214).
  it('renders SITE.role and SITE.pitch in the hero and the role in the SEO title', async () => {
    const doc = new JSDOM(await container.renderToString(Index)).window.document;

    const role = doc.querySelector('#about-me h2');
    assert.exists(role);
    expect(role.textContent).toBe(SITE.role);

    const pitch = doc.querySelector('#about-me p');
    assert.exists(pitch);
    expect(pitch.textContent).toBe(SITE.pitch);

    const title = doc.querySelector('title');
    assert.exists(title);
    expect(title.textContent).toBe(`${SITE.name} | ${SITE.role}`);
  });
});
