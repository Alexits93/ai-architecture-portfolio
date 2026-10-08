import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach } from 'vitest';
import ExperienceList from './ExperienceList.astro';

describe('ExperienceList Widget (Astro)', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render the main experience-list-container', async () => {
    const html = await container.renderToString(ExperienceList);
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const wrapper = doc.querySelector('.experience-list-container');
    expect(wrapper).not.toBeNull();
  });

  it('should render the experience items', async () => {
    const html = await container.renderToString(ExperienceList);
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const items = doc.querySelectorAll('.experience-item');
    expect(items.length).toBeGreaterThan(0);
  });

});
