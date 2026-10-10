import { ESLint } from 'eslint';
import { describe, it, expect } from 'vitest';

describe('ESLint Configuration (Deterministic Enforcement)', () => {
  it('should explicitly ban "any" and "unknown" types', async () => {
    const eslint = new ESLint();
    const results = await eslint.lintText('let a: any = 1; let b: unknown = 2;');
    const messages = results[0].messages;
    const ruleIds = messages.map(m => m.ruleId);
    
    expect(ruleIds).toContain('@typescript-eslint/no-explicit-any');
    expect(ruleIds).toContain('no-restricted-syntax'); // Our custom unknown ban
  });

  it('should ban "as unknown as Type" casting bypasses', async () => {
    const eslint = new ESLint();
    const results = await eslint.lintText('const a = 1 as unknown as string;');
    const messages = results[0].messages;
    const ruleIds = messages.map(m => m.ruleId);
    
    expect(ruleIds).toContain('no-restricted-syntax');
  });

  it('should enforce strict complexity metrics natively', async () => {
    const eslint = new ESLint();
    
    // 4 parameters (exceeds our max-params of 3)
    const results = await eslint.lintText('function test(a, b, c, d) { return a + b + c + d; }');
    const messages = results[0].messages;
    const ruleIds = messages.map(m => m.ruleId);
    
    expect(ruleIds).toContain('max-params');
  });
});

// ADR 002: Astro conventions (https://docs.astro.build/en/basics/project-structure/, Astro 7.3.8).
// https://eslint.org/docs/latest/rules/no-restricted-imports (ESLint 10.12.0), scoped per folder with flat-config `files`.
describe('ESLint import-boundary gate', () => {
  const restricted = async (code: string, filePath: string) =>
    (await new ESLint().lintText(code, { filePath }))[0].messages.filter((m) => m.ruleId === 'no-restricted-imports');

  it.each([
    ['src/components/X.astro', "---\nimport P from '@/pages/index.astro';\n---\n"],
    ['src/components/X.astro', "---\nimport L from '@/layouts/BaseLayout.astro';\n---\n"],
    ['src/components/ui/X.ts', "import P from '../../pages/index.astro';\n"],
    ['src/layouts/X.astro', "---\nimport P from '@/pages/index.astro';\n---\n"],
    ['src/lib/x.ts', "import C from '@/components/X.astro';\n"],
    ['src/lib/x.ts', "import L from '../layouts/BaseLayout.astro';\n"],
  ])('blocks an upward import in %s: %j', async (filePath, code) => {
    expect(await restricted(code, filePath)).not.toEqual([]);
  });

  it.each([
    ['src/pages/x.astro', "---\nimport L from '@/layouts/BaseLayout.astro';\nimport C from '@/components/X.astro';\n---\n"],
    ['src/layouts/X.astro', "---\nimport C from '@/components/X.astro';\nimport { a } from '@/lib/a';\n---\n"],
    ['src/components/X.astro', "---\nimport T from './ui/Tag.astro';\nimport { a } from '@/lib/a';\n---\n"],
    ['src/lib/x.ts', "import { getCollection } from 'astro:content';\nimport { b } from './b';\n"],
  ])('allows a downward import in %s', async (filePath, code) => {
    expect(await restricted(code, filePath)).toEqual([]);
  });
});

// Astro 7.3.8 deprecates `z` from astro:content (node_modules/astro/types/content.d.ts); the docs import it from astro/zod
// (https://docs.astro.build/en/guides/content-collections/). The boundary blocks replace the rule's options
// (https://eslint.org/docs/latest/use/configure/rules, ESLint 10.12.0), so they must repeat this path.
describe('ESLint astro/zod gate', () => {
  const restricted = async (code: string, filePath: string) =>
    (await new ESLint().lintText(code, { filePath }))[0].messages.filter((m) => m.ruleId === 'no-restricted-imports');

  it.each([
    'src/content.config.ts',
    'src/lib/x.ts',
    'src/components/X.ts',
    'src/layouts/X.ts',
  ])('blocks z from astro:content in %s and names astro/zod', async (filePath) => {
    const messages = await restricted("import { z, defineCollection } from 'astro:content';\n", filePath);
    expect(messages).toHaveLength(1);
    expect(messages[0].message).toContain('astro/zod');
  });

  it('allows z from astro/zod and the other astro:content exports', async () => {
    const code = "import { z } from 'astro/zod';\nimport { defineCollection, getCollection } from 'astro:content';\n";
    expect(await restricted(code, 'src/content.config.ts')).toEqual([]);
  });
});

describe('ESLint XSS gate', () => {
  const html = '---\nconst x = "<b>hi</b>";\n---\n<div set:html={x} />\n';
  const ruleIds = async (filePath: string) =>
    (await new ESLint().lintText(html, { filePath }))[0].messages.map(m => m.ruleId);

  it('bans set:html in Astro components', async () => {
    expect(await ruleIds('src/widgets/x/ui/X.astro')).toContain('astro/no-set-html-directive');
  });

  it('allows set:html only in SeoHead (JSON-LD)', async () => {
    expect(await ruleIds('src/shared/ui/seo-head/SeoHead.astro')).not.toContain('astro/no-set-html-directive');
  });
});

describe('ESLint cast and debug bans', () => {
  // https://typescript-eslint.io/rules/consistent-type-assertions/ (typescript-eslint 8.71.1): const assertions stay allowed.
  it.each([
    ['src/shared/lib/x.ts', 'const a = b as string; const c = <string>b; const d = [1] as const;\n'],
    ['src/widgets/x/ui/X.astro', '<script>const a = b as string; const d = [1] as const;</script>\n'],
  ])('bans every type assertion but as const in %s', async (filePath, code) => {
    const messages = (await new ESLint().lintText(code, { filePath }))[0].messages;
    const casts = messages.filter((m) => m.ruleId === '@typescript-eslint/consistent-type-assertions');
    expect(casts).toHaveLength(code.includes('<string>') ? 2 : 1);
  });

  // https://eslint.org/docs/latest/rules/no-console (ESLint 10.12.0)
  it('bans console calls', async () => {
    const messages = (await new ESLint().lintText('console.log(1);\n', { filePath: 'src/shared/lib/x.ts' }))[0].messages;
    expect(messages.map((m) => m.ruleId)).toContain('no-console');
  });

  // https://eslint.org/docs/latest/use/configure/configuration-files (ESLint 10.12.0): linterOptions.noInlineConfig
  it.each([
    '// eslint-disable-next-line no-console\nconsole.log(1);\n',
    '/* eslint-disable */\nconsole.log(1);\n',
    '/* eslint no-console: "off" */\nconsole.log(1);\n',
  ])('ignores inline config comments: %j', async (code) => {
    const messages = (await new ESLint().lintText(code, { filePath: 'src/shared/lib/x.ts' }))[0].messages;
    expect(messages.map((m) => m.ruleId)).toContain('no-console');
  });
});

describe('ESLint CSP gate', () => {
  const ruleIds = async (code: string) =>
    (await new ESLint().lintText(code, { filePath: 'src/widgets/x/ui/X.astro' }))[0].messages.map(m => m.ruleId);

  it('bans inline is:inline scripts', async () => {
    expect(await ruleIds('<script is:inline>console.log(1)</script>\n')).toContain('no-restricted-syntax');
  });

  it('allows is:inline scripts loaded from a file and JSON-LD data blocks', async () => {
    expect(await ruleIds('<script is:inline src="/theme.js"></script>\n')).not.toContain('no-restricted-syntax');
    expect(await ruleIds('<script type="application/ld+json" is:inline>{}</script>\n')).not.toContain('no-restricted-syntax');
  });
});

describe('ESLint AI-prose gate', () => {
  const ruleIds = async (code: string, filePath = 'src/shared/lib/x.ts') =>
    (await new ESLint().lintText(code, { filePath }))[0].messages.map(m => m.ruleId);

  it.each([
    ['a banned word in a comment', '// a robust helper\nexport const a = 1;\n', 'no-warning-comments'],
    ['an em-dash in a comment', '// fast — small\nexport const a = 1;\n', 'no-warning-comments'],
    ['a banned word in a string', 'export const a = "Moreover, yes";\n', 'no-restricted-syntax'],
    ['an emoji in a template', 'export const a = `shipped \u{1F680}`;\n', 'no-restricted-syntax'],
    ['a text-style emoji in a string', 'export const a = "ok \u2764 yes";\n', 'no-restricted-syntax'],
    ['an escaped em-dash in a template', 'export const a = `a \\u2014 b`;\n', 'no-restricted-syntax'],
  ])('flags %s', async (_label, code, ruleId) => {
    expect(await ruleIds(code)).toContain(ruleId);
  });

  it.each([
    ['template text', '<p>A seamless site</p>\n'],
    ['an HTML comment', '<!-- a robust page -->\n<p>x</p>\n'],
    ['a style comment', '<p>x</p>\n<style>\n/* a robust rule */\np { color: red; }\n</style>\n'],
  ])('flags slop in Astro %s', async (_label, code) => {
    expect(await ruleIds(code, 'src/widgets/x/ui/X.astro')).toContain('no-restricted-syntax');
  });

  it('keeps the type bans in files exempt from the prose gate', async () => {
    expect(await ruleIds('export const a = 1 as unknown as number;\n', 'tests/config/eslint.spec.ts')).toContain('no-restricted-syntax');
  });

  it('allows plain text, derived words and the copyright, registered and trademark signs', async () => {
    expect(await ruleIds('// robustness tests\nexport const a = "© ® ™ 2026";\n')).toEqual([]);
  });
});

describe('ESLint inline style message', () => {
  // <style define:vars> renders style="--x: ..." on elements (Astro 7.3.8), which the hashed CSP blocks,
  // so the message must point to classes or data-* attributes instead.
  it('points dynamic inline styles to a class or data-* attribute, and says define:vars is blocked too', async () => {
    const code = '---\nconst c = 1;\n---\n<p style={{ color: c }}>x</p>\n';
    const messages = (await new ESLint().lintText(code, { filePath: 'src/widgets/x/ui/X.astro' }))[0].messages;
    const style = messages.find((m) => m.message.includes('style={...}'));
    expect(style?.message).toContain('data-*');
    expect(style?.message).toContain('The hashed CSP blocks style attributes, including those <style define:vars> renders');
  });
});
