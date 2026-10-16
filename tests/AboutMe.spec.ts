import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { it, expect, assert } from 'vitest';
import AboutMe from '@/pages/_AboutMe.astro';
import { SITE, SOCIAL_LINKS } from '@/consts';

const render = async () => new JSDOM(await (await AstroContainer.create()).renderToString(AboutMe)).window.document;

// Each icon is decorative and sized against layout shift; the link text names the profile, in the same tab.
it('renders each social link with its accessible name and a hidden icon', async () => {
  const doc = await render();
  const links = [...doc.querySelectorAll('.social-links a')].map((link) => {
    const svg = link.querySelector('svg');
    assert.exists(svg);
    return [link.textContent.trim(), link.getAttribute('href'), link.getAttribute('target'), svg.getAttribute('aria-hidden'), svg.getAttribute('width')];
  });
  expect(links).toEqual([
    ['GitHub', SOCIAL_LINKS.github, null, 'true', '25'],
    ['LinkedIn', SOCIAL_LINKS.linkedin, null, 'true', '25'],
    ['Stack Overflow', SOCIAL_LINKS.stackoverflow, null, 'true', '25'],
    ['Instagram', SOCIAL_LINKS.instagram, null, 'true', '25'],
  ]);
});

// The role belongs to the name, so it is a paragraph in the hgroup, and "About" is the next h2.
it('renders the role in the name hgroup and About as an h2', async () => {
  const doc = await render();
  expect([...doc.querySelectorAll('h1, h2, h3')].map((heading) => `${heading.tagName} ${heading.textContent}`)).toEqual([
    `H1 ${SITE.name}`,
    'H2 About',
  ]);
  const role = doc.querySelector('hgroup > h1 + p.role');
  assert.exists(role);
  expect(role.textContent).toBe(SITE.role);
});
