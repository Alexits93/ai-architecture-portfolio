 
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach } from 'vitest';
import Index from '../src/pages/index.astro';

describe('Home Page (index.astro)', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render the layout with AboutMe and stubbed widgets', async () => {
    const html = await container.renderToString(Index);
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const main = doc.querySelector('main');
    expect(main).not.toBeNull();

    // Check for the CSS grid structural classes
    const wrapper = doc.querySelector('.home-wrapper');
    expect(wrapper).not.toBeNull();

    const topWrapper = doc.querySelector('.home-top-wrapper');
    expect(topWrapper).not.toBeNull();

    const bottomWrapper = doc.querySelector('.home-bottom-wrapper');
    expect(bottomWrapper).not.toBeNull();

    // Check for AboutMe
    const aboutMe = doc.querySelector('section#about-me');
    expect(aboutMe).not.toBeNull();

    // Check for BlogPostFeatured Stub
    const blogFeatured = doc.querySelector('section#blog-featured');
    expect(blogFeatured).not.toBeNull();

    // Check for BlogPostRecommended Stub
    const blogRecommended = doc.querySelector('section#blog-section');
    expect(blogRecommended).not.toBeNull();
  });
});
