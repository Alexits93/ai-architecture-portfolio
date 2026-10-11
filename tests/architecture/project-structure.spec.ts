import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';

describe('Project Structure & Tooling Check (Deterministic Guardrails)', () => {
  it('should enforce Astro 7+ loaders (no legacy src/content/config.ts)', () => {
    const legacyConfigPath = path.join(process.cwd(), 'src/content/config.ts');
    const modernConfigPath = path.join(process.cwd(), 'src/content.config.ts');

    expect(fs.existsSync(legacyConfigPath)).toBe(false);
    
    // We enforce that if a content collection exists, it must use the modern file
    const contentDirExists = fs.existsSync(path.join(process.cwd(), 'src/content'));
    if (contentDirExists) {
      expect(fs.existsSync(modernConfigPath)).toBe(true);
    }
  });

  // Owner correction 2026-10-10: the structure follows Astro's conventions, not Feature-Sliced Design
  // (docs/adrs/002-astro-conventions.md, the one file that names it). Covers blog posts too (#78).
  it('keeps Feature-Sliced Design out of agent context, config and source', () => {
    const files = fs.globSync(
      ['CLAUDE.md', 'README.md', 'package.json', 'eslint.config.mjs', '.claude/settings.json', '.claude/rules/*', '.github/**/*', 'docs/**/*.md', 'src/**/*'],
      { cwd: process.cwd(), exclude: ['docs/adrs/002-astro-conventions.md'] },
    ).filter((f) => fs.statSync(path.join(process.cwd(), f)).isFile());
    expect(files.filter((f) => /feature-sliced|\bFSD\b/i.test(fs.readFileSync(f, 'utf8')))).toEqual([]);
  });

  // Every page renders through a layout (ADR 002, .claude/rules/architecture.md, #113).
  it('keeps the document shell out of pages', () => {
    const pages = fs.globSync('src/pages/**/*.astro', { cwd: process.cwd() });
    expect(pages.length).toBeGreaterThan(5);
    expect(pages.filter((f) => /<(html|head|body)[\s>]/.test(fs.readFileSync(f, 'utf8')))).toEqual([]);
  });

  // The logo lives once in src/assets/logo.svg; components import it as an SVG component (#119).
  it('keeps the logo path data out of components', () => {
    const logo = fs.readFileSync(path.join(process.cwd(), 'src/assets/logo.svg'), 'utf8');
    expect(logo).toContain('m123.48,57.74H54.68');
    const components = fs.globSync('src/**/*.astro', { cwd: process.cwd() });
    expect(components.filter((f) => fs.readFileSync(f, 'utf8').includes('m123.48,57.74H54.68'))).toEqual([]);
  });
});
