import { ESLint } from 'eslint';
import { describe, it, expect } from 'vitest';

// Vitest has no content store, so a route page rendered in a spec reads empty collections and its checks pass on
// markup that exists without data (#225, #226). A spec that imports a route page mocks astro:content.
describe('ESLint gate on route pages in Vitest specs', () => {
  const pageBans = async (code: string) =>
    (await new ESLint().lintText(code, { filePath: 'tests/x.spec.ts' }))[0].messages
      .filter((m) => m.ruleId === 'no-restricted-syntax')
      .map((m) => m.message);

  it.each([
    "import Index from '@/pages/index.astro';\nexport const a = Index;\n",
    "import Post from '@/pages/blog/[slug].astro';\nexport const a = Post;\n",
  ])('flags a route page import without a mock: %j', async (code) => {
    expect(await pageBans(code)).toEqual([expect.stringMatching(/astro:content/)]);
  });

  it('allows a route page import with an astro:content mock', async () => {
    const code = "import { vi } from 'vitest';\nimport Index from '@/pages/index.astro';\nvi.mock('astro:content', () => ({ getCollection: vi.fn() }));\nexport const a = Index;\n";
    expect(await pageBans(code)).toEqual([]);
  });

  it.each([
    "import BlogFeed from '@/pages/blog/_BlogFeed.astro';\nexport const a = BlogFeed;\n",
    "import { GET } from '@/pages/og.png';\nexport const a = GET;\n",
  ])('leaves page-only components and endpoints alone: %j', async (code) => {
    expect(await pageBans(code)).toEqual([]);
  });
});
