import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { HANDOVER_MARKER } from '../../.github/workflow-rules.mjs';
import { connection, fakeGh, planIssue, removeFakeBins } from './fake-gh.fixture';

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

afterAll(removeFakeBins);

// fakeGh with a `git` that fails, as outside a repository.
const failingGit = (answer: string): { PATH: string } => {
  const env = fakeGh(answer, 0);
  fs.writeFileSync(path.join(env.PATH.split(path.delimiter)[0], 'git'), '#!/bin/sh\nexit 128\n', { mode: 0o755 });
  return env;
};

const run = (env: { PATH: string }): string =>
  spawnSync(process.execPath, [path.join(process.cwd(), '.claude/hooks/session-plan.mjs')], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
  }).stdout;

// One fake answer serves every query: the plan reads `issues`, the handover lookup reads `issue`,
// the open-PR fallback for an unlinked branch reads `pullRequests`.
const owner = (body: string) => ({ body, authorAssociation: 'OWNER' });
const epic = planIssue({ number: 32, title: '[Epic] E', parent: null });
const repository = {
  issues: connection([epic, planIssue({ number: 63, title: '[Task] T', parent: { number: 32 } }, ['chore/t'])]),
  issue: { comments: connection([owner(`${HANDOVER_MARKER}\nNext: tests`), owner('Measured')]) },
};
const prComment = { createdAt: '2026-10-10T00:00:00Z', ...owner(`${HANDOVER_MARKER}\nFrom PR`) };
const pr = { number: 46, closingIssuesReferences: connection([{ number: 63, title: '[Task] T', comments: connection([prComment]) }]) };
const withPr = (pullRequests: { nodes: Array<typeof pr> } | null): string => JSON.stringify({ data: { repository: { ...repository, pullRequests } } });
const answer = withPr({ nodes: [] });

describe('session-plan hook', () => {
  it('prints the open issue tree', () => {
    expect(run(fakeGh(answer, 0))).toContain('- #32 [Epic] E\n  - #63 [Task] T');
  });

  it('prints the current Task and its newest handover', () => {
    expect(run(fakeGh(answer, 0, 'chore/t'))).toContain(
      `Current Task: #63 [Task] T (branch chore/t)\nHandover:\n${HANDOVER_MARKER}\nNext: tests`,
    );
  });

  it('says when no Task is linked to the branch', () => {
    expect(run(fakeGh(answer, 0))).toContain('No open Task is linked to branch master.');
  });

  it('loads the newest handover of the open PR for an unlinked branch', () => {
    expect(run(fakeGh(withPr({ nodes: [pr] }), 0))).toContain(
      `Current Task: #63 [Task] T (newest handover in PR #46)\nHandover:\n${HANDOVER_MARKER}\nFrom PR`,
    );
  });

  it.each([
    ['the open-PR lookup answers without pullRequests', fakeGh(withPr(null), 0)],
    ['gh fails', fakeGh('', 1)],
    ['gh answers garbage', fakeGh('not json', 0)],
    ['gh is missing', { PATH: '' }],
    ['git fails', failingGit(answer)],
    ['more open issues exist than one page holds', fakeGh(answer.replace('"hasNextPage":false', '"hasNextPage":true'), 0)],
    ['the Task has more comments than one page holds', fakeGh(answer.replaceAll('"hasPreviousPage":false', '"hasPreviousPage":true'), 0, 'chore/t')],
  ])('prints a stop notice when %s', (_label, env) => {
    expect(run(env)).toContain('PLAN UNAVAILABLE');
  });
});

// sandbox.excludedCommands apply only to a standalone call; a cd, chain, pipe, redirect or
// substitution keeps it sandboxed, and the unsandboxed retry then widens far more than the one command.
const sandboxGate = (command: string): { status: number | null; stderr: string } =>
  spawnSync('node', [path.join(process.cwd(), '.claude/hooks/sandbox-gate.mjs')], {
    input: JSON.stringify({ tool_input: { command } }),
    encoding: 'utf8',
  });

describe('sandbox-gate hook', () => {
  it.each([
    ['a redirect', 'git push origin main > /tmp/push.log 2>&1'],
    ['a chain', 'git push origin main && echo done'],
    ['a leading cd', 'cd /x && gh issue view 63'],
    ['a semicolon', 'gh issue view 63; git log'],
    ['a pipe', 'gh pr view 46 | head'],
    ['a substitution', 'gh issue comment 63 --body "$(cat x.md)"'],
    ['a backtick substitution', 'gh run view `cat id`'],
  ])('blocks an excluded command with %s', (_label, command) => {
    const result = sandboxGate(command);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Blocked by .claude/hooks/sandbox-gate.mjs');
  });

  it.each([
    ['a standalone push', 'git push origin chore/x:chore/y'],
    ['a pipe inside a quoted jq filter', `gh issue view 63 --json comments --jq '.comments[] | .body'`],
    ['other chained commands', 'git status && git log --oneline -1 > /tmp/x'],
    ['quoted text that mentions an excluded command', 'git commit -m "docs: run git push; then gh pr view"'],
  ])('allows %s', (_label, command) => {
    expect(sandboxGate(command).status).toBe(0);
  });
});

describe('lint-feedback hook', () => {
  // Created at runtime so the repo itself never contains a lint error, outside the read-only gate test folders.
  const brokenFile = path.join(process.cwd(), 'tests/tmp-lint-error.ts');
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
