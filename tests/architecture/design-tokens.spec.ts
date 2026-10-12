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
});
