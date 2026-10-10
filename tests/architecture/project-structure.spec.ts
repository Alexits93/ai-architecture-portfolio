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
  // (docs/adrs/002-astro-conventions.md, the one file that names it). Task #78 drops the article exception.
  it('keeps Feature-Sliced Design out of agent context, config and source', () => {
    const files = fs.globSync(
      ['CLAUDE.md', 'README.md', 'package.json', 'eslint.config.mjs', '.claude/settings.json', '.claude/rules/*', '.github/**/*', 'docs/**/*.md', 'src/**/*'],
      { cwd: process.cwd(), exclude: ['docs/adrs/002-astro-conventions.md', 'src/content/blog/feature-sliced-design-astro.md'] },
    ).filter((f) => fs.statSync(path.join(process.cwd(), f)).isFile());
    expect(files.filter((f) => /feature-sliced|\bFSD\b/i.test(fs.readFileSync(f, 'utf8')))).toEqual([]);
  });
});
