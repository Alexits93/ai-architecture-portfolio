import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, assert } from 'vitest';
import { Content } from '../__mocks__/code-fence.md';

// The CSP hashes style-src, so inline style attributes (Shiki's output) are blocked.
// Code fences must highlight through classes only (markdown.syntaxHighlight: 'prism').
describe('Markdown code fences under CSP', () => {
  it('highlights with Prism token classes and no inline styles', async () => {
    const container = await AstroContainer.create();
    const doc = new JSDOM(await container.renderToString(Content)).window.document;

    const el = doc.querySelector('pre.language-ts > code.language-ts .token.keyword');
    assert.exists(el);
    expect(el.textContent).toBe('const');
    expect(doc.querySelectorAll('[style]')).toHaveLength(0);
  });
});
