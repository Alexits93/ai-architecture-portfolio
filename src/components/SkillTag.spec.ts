import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach, assert } from 'vitest';
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
    const tag = tags.item(0);
    assert.exists(tag);
    expect(tag.tagName).toBe('SPAN');
    expect(tag.textContent.trim()).toBe('#vue.js');
  });
});
