import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach } from 'vitest';
import SkillTag from './SkillTag.astro';

describe('SkillTag Component - Non-Interactive', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render a non-interactive tag by default', async () => {
    const html = await container.renderToString(SkillTag, {
      props: { skill: 'Astro' }
    });
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const span = doc.querySelector('span.skill-tag.non-interactive');
    expect(span).not.toBeNull();
    // Should have a hash and lowercase
    expect(span?.textContent?.trim()).toBe('#astro');
  });

  it('should render the default text if no skill is provided', async () => {
    const html = await container.renderToString(SkillTag);
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const span = doc.querySelector('span.skill-tag.non-interactive');
    expect(span?.textContent?.trim()).toBe('#404 - skill not found');
  });
});

describe('SkillTag Component - Interactive', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render as a button when interactive is true', async () => {
    const html = await container.renderToString(SkillTag, {
      props: { skill: 'TypeScript', interactive: true }
    });
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const button = doc.querySelector('button.skill-tag.interactive');
    expect(button).not.toBeNull();
    // Should NOT have a hash
    expect(button?.textContent?.trim()).toBe('TypeScript');
    // Should default to not active
    expect(button?.getAttribute('aria-pressed')).toBe('false');
    expect(button?.classList.contains('active')).toBe(false);
  });

  it('should render active state correctly', async () => {
    const html = await container.renderToString(SkillTag, {
      props: { skill: 'TypeScript', interactive: true, active: true }
    });
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const button = doc.querySelector('button.skill-tag.interactive.active');
    expect(button).not.toBeNull();
    expect(button?.getAttribute('aria-pressed')).toBe('true');
  });
});
