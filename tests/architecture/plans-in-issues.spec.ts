import * as fs from 'fs';
import { describe, it, expect } from 'vitest';

// Plans, specs and devspecs live in GitHub issues. A copy in the repo drifts from the issues,
// and agents read repo files as truth, so these files fail CI.

const PLAN_FILE = /(^|\/)exec-plans\/|\.(plan|spec|devspec)\.md$|(^|\/)[^/]*-pathology\.md$/;

describe('Plans live in GitHub issues', () => {
  it.each([
    ['docs/exec-plans/x.md', true],
    ['docs/modernization.plan.md', true],
    ['src/widgets/a/Alert.devspec.md', true],
    ['docs/header.spec.md', true],
    ['src/x/menu-pathology.md', true],
    ['docs/ARCHITECTURE.md', false],
    ['docs/adrs/001-framework-migration.md', false],
    ['src/content/blog/specs-for-humans.md', false],
  ])('classifies %s as a plan file: %s', (file, expected) => {
    expect(PLAN_FILE.test(file)).toBe(expected);
  });

  it('keeps no plan, spec or devspec Markdown files in the repo', () => {
    const markdown = fs.globSync('**/*.md', { exclude: (p) => p.includes('node_modules') });
    expect(markdown.filter((file) => PLAN_FILE.test(file))).toEqual([]);
  });
});
