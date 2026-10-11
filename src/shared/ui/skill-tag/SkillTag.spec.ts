import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach } from 'vitest';
import SkillTag from './SkillTag.astro';

describe('SkillTag Component', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('renders the skill as a lowercased hashtag span', async () => {
    const html = await container.renderToString(SkillTag, {
      props: { skill: 'Vue.js' }
    });
    const doc = new JSDOM(html).window.document;

    const tags = doc.querySelectorAll('.skill-tag');
    expect(tags).toHaveLength(1);
    expect(tags[0]?.tagName).toBe('SPAN');
    expect(tags[0]?.classList.contains('non-interactive')).toBe(true);
    expect(tags[0]?.textContent?.trim()).toBe('#vue.js');
  });

  it('has no interactive variant in its source', () => {
    const source = readFileSync(new URL('./SkillTag.astro', import.meta.url), 'utf-8');

    // The kept class `non-interactive` must not match.
    for (const dead of [/(?<!non-)\binteractive\b/, /\bactive\b/, /data-skill/, /<button/]) {
      expect(source).not.toMatch(dead);
    }
  });
});
