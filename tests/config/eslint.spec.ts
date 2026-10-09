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

  it('should enforce Feature-Sliced Design (FSD) architecture boundaries', async () => {
    const eslint = new ESLint();
    
    // Simulate a file inside 'shared' improperly trying to import from 'features' (Upward dependency)
    const results = await eslint.lintText(
      "import { someFeature } from '@/features/auth';", 
      { filePath: "src/shared/ui/button.ts" }
    );
    
    const messages = results[0].messages;
    const ruleIds = messages.map(m => m.ruleId);
    
    // Layers-slices rule should catch the boundary violation
    expect(ruleIds).toContain('@conarti/feature-sliced/layers-slices');
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
