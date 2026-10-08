import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach } from 'vitest';
import ExperienceList from './ExperienceList.astro';

describe('ExperienceList Widget (Astro)', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render the main cv-wrapper', async () => {
    const html = await container.renderToString(ExperienceList);
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const wrapper = doc.querySelector('.cv-wrapper');
    expect(wrapper).not.toBeNull();
  });

  it('should render the experience items', async () => {
    const html = await container.renderToString(ExperienceList);
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const items = doc.querySelectorAll('.experience-item');
    expect(items.length).toBeGreaterThan(0);
  });

  it('should render the download CV link', async () => {
    const html = await container.renderToString(ExperienceList);
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const downloadLink = doc.querySelector('a[download="patrik-alexits-cv.pdf"]');
    expect(downloadLink).not.toBeNull();
    expect(downloadLink?.getAttribute('href')).toBe('/assets/files/patri-alexits-cv.pdf');
  });
});
