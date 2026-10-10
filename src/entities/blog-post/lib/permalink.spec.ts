import { describe, it, expect } from 'vitest';
import { getPostPath } from './permalink';

describe('blog post permalinks', () => {
  it('builds the canonical path from the slug with a trailing slash', () => {
    expect(getPostPath({ id: 'ai-agent-harness' })).toBe('/blog/ai-agent-harness/');
  });
});
