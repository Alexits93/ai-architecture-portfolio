import * as fs from 'fs';
import { describe, it, expect } from 'vitest';

// Design tokens (#197): src/styles/tokens.css writes each colour once with light-dark(), and global.css
// orders reset, tokens and base with @layer, so Astro's unlayered scoped styles still win
// (https://developer.mozilla.org/en-US/docs/Web/CSS/@layer).
const TOKENS = 'src/styles/tokens.css';
const GLOBAL = 'src/styles/global.css';
const COLOR_LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|light-dark)\(/i;

const read = (file: string) => fs.readFileSync(file, 'utf8');
const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('design tokens', () => {
  it('keeps light-dark() in tokens.css only', () => {
    expect(withoutComments(read(TOKENS))).toMatch(/light-dark\(/);
    const others = fs
      .globSync('src/**/*.{css,astro}')
      .filter((file) => file !== TOKENS && /light-dark\(/.test(withoutComments(read(file))));
    expect(others).toEqual([]);
  });

  it('lets color-scheme drive the theme instead of a second dark palette', () => {
    const tokens = withoutComments(read(TOKENS));
    expect(tokens).toMatch(/:root\s*\{[^}]*color-scheme:\s*light dark;/);
    expect(tokens).toMatch(/\[data-theme="light"\]\s*\{\s*color-scheme:\s*light;\s*\}/);
    expect(tokens).toMatch(/\[data-theme="dark"\]\s*\{\s*color-scheme:\s*dark;\s*\}/);
    expect(tokens).not.toMatch(/prefers-color-scheme/);
  });

  it('starts global.css with the layer order and imports the tokens into their layer', () => {
    const css = withoutComments(read(GLOBAL)).trim();
    expect(css.startsWith('@layer reset, tokens, base;')).toBe(true);
    expect(css).toContain("@import './tokens.css' layer(tokens);");
  });

  it('keeps colour literals out of global.css', () => {
    expect(withoutComments(read(GLOBAL))).not.toMatch(COLOR_LITERAL);
  });

  it('keeps global.css to the layer statement, imports, view transitions and layers', () => {
    const css = withoutComments(read(GLOBAL));
    const topLevel: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < css.length; i++) {
      if (css[i] === '{') depth++;
      if (css[i] === '}' && --depth === 0) {
        topLevel.push(css.slice(start, i + 1).trim());
        start = i + 1;
      }
      if (css[i] === ';' && depth === 0) {
        topLevel.push(css.slice(start, i + 1).trim());
        start = i + 1;
      }
    }
    expect(topLevel.filter((rule) => !/^@(?:layer|import|view-transition)\b/.test(rule))).toEqual([]);
  });
});

// Raw-literal gate (#198): component <style> blocks take colours, lengths, radii and shadows from tokens.css,
// and @media uses only the documented breakpoints. src/styles/ is exempt, since it defines the tokens.
const BREAKPOINTS = ['48rem', '64rem', '80rem', '20rem'];
const ALLOWED_EVERYWHERE = ['100%'];
// Owner decision 2026-10-12: one-off geometry stays a literal, pinned to the file that needs it.
const ALLOWED_IN_FILE: Record<string, { values: string[]; reason: string }> = {
  'src/pages/blog/_ArticleNavigator.astro': {
    values: ['5px', '-1.22rem', '50%'],
    reason: 'bullet placement on the 1px guide line',
  },
  'src/components/Header.astro': { values: ['.2rem'], reason: 'hamburger bar thickness' },
  'src/components/NavigatorMenu.astro': {
    values: ['2.6rem', '.2rem', '0.1rem', '-0.1rem', '100vw', '100vh', '150vmax'],
    reason: 'full-viewport dialog, reveal origin over the hamburger, bar thickness and cross offset',
  },
  'src/pages/blog/_BlogPostReader.astro': {
    values: ['.125rem', '.875em'],
    reason: 'inline code padding and size relative to the surrounding text',
  },
};

const LENGTH =
  /(?<![\w.#])-?(?:\d+\.?\d*|\.\d+)(?:px|rem|em|ex|ch|vmin|vmax|vw|vh|svh|lvh|dvh|svw|lvw|dvw|cqw|cqh|cqi|cqb|pt|pc|cm|mm|in|Q|%)(?![\w-])/g;
const DECLARATION = /[\w-]+\s*:\s*([^;{}]+)/g;
const MEDIA = /@media([^{]+)\{/g;

const styleBlocks = (source: string) =>
  [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]).join('\n');

const findViolations = (file: string, css: string) => {
  const allowed = [...ALLOWED_EVERYWHERE, ...(file in ALLOWED_IN_FILE ? ALLOWED_IN_FILE[file].values : [])];
  const violations: string[] = [];
  let rest = withoutComments(css);
  for (const [, prelude] of rest.matchAll(MEDIA)) {
    for (const [value] of prelude.matchAll(LENGTH)) {
      if (!BREAKPOINTS.includes(value)) violations.push(`${file}: @media ${value}`);
    }
  }
  rest = rest.replace(MEDIA, '{');
  for (const [, value] of rest.matchAll(DECLARATION)) {
    if (COLOR_LITERAL.test(value)) violations.push(`${file}: ${value.trim()}`);
    for (const [length] of value.matchAll(LENGTH)) {
      if (!allowed.includes(length)) violations.push(`${file}: ${length}`);
    }
  }
  return violations;
};

const componentFiles = () => fs.globSync('src/**/*.astro').filter((file) => /<style[^>]*>/.test(read(file)));

describe('raw-literal gate', () => {
  it.each([
    ['.a { padding: 1rem; }', ['x.astro: 1rem']],
    ['.a { padding: var(--space-4); }', []],
    ['.a { color: #fff; }', ['x.astro: #fff']],
    ['.a { color: hsl(200, 10%, 15%); }', ['x.astro: hsl(200, 10%, 15%)', 'x.astro: 10%', 'x.astro: 15%']],
    ['.a { color: rgba(0, 0, 0, .1); }', ['x.astro: rgba(0, 0, 0, .1)']],
    ['.a { color: light-dark(white, black); }', ['x.astro: light-dark(white, black)']],
    ['@media (min-width: 900px) { .a { display: grid; } }', ['x.astro: @media 900px']],
    ['@media (min-width: 48rem) { .a { display: grid; } }', []],
    ['.a { width: 100%; margin: 0; translate: 0 -1px; }', ['x.astro: -1px']],
    ['.line { border-top: 1px solid var(--font-color); }', ['x.astro: 1px']],
    ['#abc-menu .a { gap: var(--space-2); }', []],
  ])('checks %s', (css, expected) => {
    expect(findViolations('x.astro', css)).toEqual(expected);
  });

  it('allows a per-file value only in its file', () => {
    const file = 'src/components/Header.astro';
    expect(findViolations(file, '.bar { height: .2rem; }')).toEqual([]);
    expect(findViolations('x.astro', '.bar { height: .2rem; }')).toEqual(['x.astro: .2rem']);
  });

  it('scans the component style blocks', () => {
    expect(componentFiles().length).toBeGreaterThanOrEqual(13);
    expect(componentFiles().every((file) => !file.startsWith('src/styles/'))).toBe(true);
  });

  it('finds no raw colour, length or unlisted breakpoint in a component style', () => {
    expect(componentFiles().flatMap((file) => findViolations(file, styleBlocks(read(file))))).toEqual([]);
  });

  it('uses every per-file allowance, so a stale entry fails', () => {
    for (const [file, { values }] of Object.entries(ALLOWED_IN_FILE)) {
      const found = [...withoutComments(styleBlocks(read(file))).matchAll(LENGTH)].map(([value]) => value);
      expect(values.filter((value) => !found.includes(value)), file).toEqual([]);
    }
  });

  it('documents the breakpoint list in tokens.css', () => {
    for (const breakpoint of BREAKPOINTS) expect(read(TOKENS)).toContain(breakpoint);
  });
});
