import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, assert } from 'vitest';
import AboutMe from '@/pages/_AboutMe.astro';

describe('AboutMe Widget (Astro) - Content', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render with default props', async () => {
    const html = await container.renderToString(AboutMe);
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const name = doc.querySelector('h1');
    assert.exists(name);
    expect(name.textContent).toBe('John Doe');

    const profession = doc.querySelector('h2');
    assert.exists(profession);
    expect(profession.textContent).toBe('Jedi Council Member (Not Master though)');

    const text = doc.querySelector('p');
    assert.exists(text);
    expect(text.textContent).toBe("I don't like sand. It's coarse and rough and irritating, and it gets everywhere.");
  });

  it('should render with custom props', async () => {
    const props = {
      name: 'Jane Doe',
      profession: 'Sith Lord',
      text: 'Peace is a lie.'
    };
    const html = await container.renderToString(AboutMe, { props });
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const name = doc.querySelector('h1');
    assert.exists(name);
    expect(name.textContent).toBe('Jane Doe');

    const profession = doc.querySelector('h2');
    assert.exists(profession);
    expect(profession.textContent).toBe('Sith Lord');

    const text = doc.querySelector('p');
    assert.exists(text);
    expect(text.textContent).toBe('Peace is a lie.');
  });
});

describe('AboutMe Widget (Astro) - Social Links', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render social links if provided', async () => {
    const props = {
      githubUrl: 'https://github.com',
      linkedinUrl: 'https://linkedin.com',
      instagramUrl: 'https://instagram.com',
      stackoverflowUrl: 'https://stackoverflow.com'
    };
    const html = await container.renderToString(AboutMe, { props });
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const listItems = doc.querySelectorAll('.social-links li');
    expect(listItems.length).toBe(4);

    const githubLink = doc.querySelector('.social-links a');
    assert.exists(githubLink);
    expect(githubLink.textContent.trim()).toBe('GitHub');
    expect(githubLink.getAttribute('href')).toBe('https://github.com');
  });

  it('should not render social links ul if no urls are provided', async () => {
    const html = await container.renderToString(AboutMe);
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const ul = doc.querySelector('.social-links');
    expect(ul).toBeNull();
  });
});

// Each icon is a decorative SVG asset with an explicit 25px size (#119); the link opens in the same tab (#242). Instagram, the only non-work profile, comes last.
it('should render each social link with its accessible name and a hidden icon', async () => {
  const container = await AstroContainer.create();
  const props = {
    githubUrl: 'https://github.com',
    linkedinUrl: 'https://linkedin.com',
    instagramUrl: 'https://instagram.com',
    stackoverflowUrl: 'https://stackoverflow.com'
  };
  const doc = new JSDOM(await container.renderToString(AboutMe, { props })).window.document;

  const links = [...doc.querySelectorAll('.social-links a')].map((link) => {
    const svg = link.querySelector('svg');
    assert.exists(svg);
    return [link.textContent.trim(), link.getAttribute('target'), ...['viewBox', 'fill', 'aria-hidden', 'width', 'height'].map((name) => svg.getAttribute(name))];
  });
  expect(links).toEqual([
    ['GitHub', null, '0 0 16 16', 'currentColor', 'true', '25', '25'],
    ['LinkedIn', null, '0 0 24 24', 'currentColor', 'true', '25', '25'],
    ['Stack Overflow', null, '0 0 169.61 200', 'currentColor', 'true', '25', '25'],
    ['Instagram', null, '0 0 1000 1000', 'currentColor', 'true', '25', '25'],
  ]);
});
