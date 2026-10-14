import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';

describe('Project Structure & Tooling Check (Deterministic Guardrails)', () => {
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

  // Icons live once in src/assets/; components import them as SVG components (#119, #141).
  it('keeps inline SVG out of components', () => {
    const components = fs.globSync('src/**/*.astro', { cwd: process.cwd() });
    expect(components.filter((f) => fs.readFileSync(f, 'utf8').includes('<svg'))).toEqual([]);
  });
});
