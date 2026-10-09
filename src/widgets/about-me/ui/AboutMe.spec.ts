import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach } from 'vitest';
import AboutMe from './AboutMe.astro';

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
    expect(name?.textContent).toBe('John Doe');

    const profession = doc.querySelector('h2');
    expect(profession?.textContent).toBe('Jedi Council Member (Not Master though)');

    const text = doc.querySelector('p');
    expect(text?.textContent).toBe("I don't like sand. It's coarse and rough and irritating, and it gets everywhere.");
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
    expect(name?.textContent).toBe('Jane Doe');

    const profession = doc.querySelector('h2');
    expect(profession?.textContent).toBe('Sith Lord');

    const text = doc.querySelector('p');
    expect(text?.textContent).toBe('Peace is a lie.');
  });
});

describe('AboutMe Widget (Astro) - Spotify Iframe', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should not render Spotify iframe if no track ID is provided', async () => {
    const html = await container.renderToString(AboutMe);
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const iframe = doc.querySelector('iframe');
    expect(iframe).toBeNull();
  });

  it('should render Spotify iframe if track ID is provided and alphanumeric', async () => {
    const props = { spotifyTrackId: '1234abc' };
    const html = await container.renderToString(AboutMe, { props });
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const iframe = doc.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('src')).toBe('https://open.spotify.com/embed/track/1234abc?utm_source=generator&theme=0');
  });

  it('should NOT render Spotify iframe if track ID is malicious (XSS prevention)', async () => {
    const props = { spotifyTrackId: '123" onload="alert(1)"' };
    const html = await container.renderToString(AboutMe, { props });
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const iframe = doc.querySelector('iframe');
    expect(iframe).toBeNull();
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

    const githubLink = doc.querySelector('a[aria-label="GitHub (Opens in new tab)"]');
    expect(githubLink?.getAttribute('href')).toBe('https://github.com');
  });

  it('should not render social links ul if no urls are provided', async () => {
    const html = await container.renderToString(AboutMe);
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const ul = doc.querySelector('.social-links');
    expect(ul).toBeNull();
  });
});
