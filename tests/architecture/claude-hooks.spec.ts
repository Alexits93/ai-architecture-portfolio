import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

interface ToolInput {
  file_path: string;
  content?: string;
  new_string?: string;
}

const runHook = (script: string, toolInput: ToolInput): number | null =>
  spawnSync('node', [path.join(process.cwd(), '.claude/hooks', script)], {
    input: JSON.stringify({ tool_input: toolInput }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: process.cwd() },
    encoding: 'utf8',
  }).status;

describe('anti-slop hook', () => {
  it.each([
    ['a banned word', 'This is a robust design.'],
    ['an em-dash', 'Fast — and small.'],
    ['an emoji', 'Shipped \u{1F680}'],
  ])('blocks Markdown containing %s', (_label, content) => {
    expect(runHook('anti-slop.mjs', { file_path: 'docs/x.md', content })).toBe(2);
  });

  it('checks Edit payloads', () => {
    expect(runHook('anti-slop.mjs', { file_path: 'docs/x.md', new_string: 'Moreover, it works.' })).toBe(2);
  });

  it.each([
    ['clean Markdown', 'docs/x.md', 'Short sentences. Active voice.'],
    ['non-Markdown files', 'src/a.ts', '// robust'],
    ['CLAUDE.md, which defines the list', 'CLAUDE.md', 'Banned words: robust'],
    ['words that only contain a banned word', 'docs/x.md', 'Robustness tests.'],
    ['the copyright sign', 'docs/x.md', '© 2026'],
  ])('allows %s', (_label, file_path, content) => {
    expect(runHook('anti-slop.mjs', { file_path, content })).toBe(0);
  });
});

describe('lint-feedback hook', () => {
  // Created at runtime so the repo itself never contains a lint error.
  const brokenFile = path.join(process.cwd(), 'tests/architecture/tmp-lint-error.ts');
  beforeAll(() => fs.writeFileSync(brokenFile, 'export const a: any = 1;\n'));
  afterAll(() => fs.rmSync(brokenFile, { force: true }));

  it('reports ESLint errors with exit code 2', () => {
    expect(runHook('lint-feedback.mjs', { file_path: brokenFile })).toBe(2);
  });

  it('passes clean files and ignores non-code files', () => {
    expect(runHook('lint-feedback.mjs', { file_path: path.join(process.cwd(), 'vitest.config.ts') })).toBe(0);
    expect(runHook('lint-feedback.mjs', { file_path: path.join(process.cwd(), 'README.md') })).toBe(0);
  });
});
