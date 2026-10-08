import { describe, it, expect } from 'vitest';
import { getPostPath, getPostOgImagePath } from './permalink';

describe('blog post permalinks', () => {
  it('builds the canonical path from the slug with a trailing slash', () => {
    expect(getPostPath({ id: 'ai-agent-harness' })).toBe('/blog/ai-agent-harness/');
  });

  it('builds the per-article OG image path under the post path', () => {
    expect(getPostOgImagePath({ id: 'ai-agent-harness' })).toBe('/blog/ai-agent-harness/og.png');
  });
});
