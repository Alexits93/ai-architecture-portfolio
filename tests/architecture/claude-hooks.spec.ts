import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PR_CHECKLIST, PR_SECTIONS } from '../../.github/workflow-rules.mjs';

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

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

// Puts a fake `gh` first on PATH that prints `answer` and exits with `status`.
const fakeGh = (answer: string, status: number): { PATH: string } => {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-gh-'));
  fs.writeFileSync(path.join(bin, 'answer.json'), answer);
  fs.writeFileSync(path.join(bin, 'gh'), `#!/bin/sh\ncat "${bin}/answer.json"\nexit ${status}\n`, { mode: 0o755 });
  return { PATH: `${bin}${path.delimiter}${process.env.PATH ?? ''}` };
};

describe('session-plan hook', () => {
  const run = (env: { PATH: string }): string =>
    spawnSync(process.execPath, [path.join(process.cwd(), '.claude/hooks/session-plan.mjs')], {
      env: { ...process.env, ...env },
      encoding: 'utf8',
    }).stdout;

  it('prints the open issue tree', () => {
    const issues = [
      { number: 32, title: '[Epic] E', parent: null, blockedBy: { nodes: [] } },
      { number: 35, title: '[Story] S', parent: { number: 32 }, blockedBy: { nodes: [] } },
    ];
    const answer = JSON.stringify({ data: { repository: { issues: { nodes: issues } } } });
    expect(run(fakeGh(answer, 0))).toContain('- #32 [Epic] E\n  - #35 [Story] S');
  });

  it.each([
    ['gh fails', fakeGh('', 1)],
    ['gh answers garbage', fakeGh('not json', 0)],
    ['gh is missing', { PATH: '' }],
  ])('prints a stop notice when %s', (_label, env) => {
    expect(run(env)).toContain('PLAN UNAVAILABLE');
  });
});

// The fake `gh` answer for the pr-gate linked-issue lookup, so the tests need no network or token.
const linkedTask = (parent: { number: number } | null): string =>
  JSON.stringify({ data: { repository: { issue: { state: 'OPEN', labels: { nodes: [{ name: 'task' }] }, parent } } } });

describe('pr-gate hook', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-gate-'));
  const goodPr = path.join(dir, 'good-pr.md');
  const badPr = path.join(dir, 'bad-pr.md');
  const goodIssue = path.join(dir, 'good-issue.md');
  beforeAll(() => {
    const checklist = PR_CHECKLIST.map((item) => `- [x] ${item}`).join('\n');
    fs.writeFileSync(goodPr, PR_SECTIONS.map((s) => `## ${s}\n${s === 'Pre-Merge Checklist' ? checklist : '- Closes #44'}`).join('\n'));
    fs.writeFileSync(badPr, read('.github/PULL_REQUEST_TEMPLATE.md'));
    fs.writeFileSync(goodIssue, '### Description\n\nA\n\n### Requirements / Constraints\n\nB\n');
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  const gate = (command: string, ghAnswer = linkedTask({ number: 35 })): number | null =>
    spawnSync('node', [path.join(process.cwd(), '.claude/hooks/pr-gate.mjs')], {
      input: JSON.stringify({ cwd: dir, tool_input: { command } }),
      env: { ...process.env, ...fakeGh(ghAnswer, 0) },
      encoding: 'utf8',
    }).status;

  it.each([
    ['a linked Task without native parent', linkedTask(null)],
    ['a linked PR number instead of an issue', '{"data":{"repository":{"issue":null}}}'],
  ])('blocks a PR with %s', (_label, ghAnswer) => {
    expect(gate('gh pr create --title "chore: x" --body-file good-pr.md', ghAnswer)).toBe(2);
  });

  it.each([
    ['a body passed inline', 'gh pr create --title "chore: x" --body "hi"'],
    ['a body file that breaks the rules', 'gh pr create --title "chore: x" --body-file bad-pr.md'],
    ['a title that is no Conventional Commit', 'gh pr create --title "Add gates" --body-file good-pr.md'],
    ['a missing title', 'gh pr create --body-file good-pr.md'],
    ['a missing body file', 'gh pr create --title "chore: x" --body-file nope.md'],
    ['an issue without label', 'gh issue create --title "[Task] X" --body-file good-issue.md'],
    ['an issue body that misses sections', 'gh issue create -t "[Task] X" -l task --parent 35 -F bad-pr.md'],
    ['a Task without native parent', 'gh issue create --title "[Task] X" --label task --body-file good-issue.md'],
    ['a prefixed call', 'cd /x; GH_PAGER= env gh pr create --title "chore: x"'],
  ])('blocks %s', (_label, command) => {
    expect(gate(command)).toBe(2);
  });

  it.each([
    ['a valid PR', `git push && gh pr create --base master --title 'chore(claude): gate PRs' --body-file good-pr.md`],
    ['a valid issue', 'gh issue create --title "[Task] X" --label task --parent 35 --body-file good-issue.md'],
    ['other commands', 'gh pr view 44'],
    ['text that mentions the command', "git commit -F - <<'EOF'\nchore: gate gh pr create\nEOF"],
  ])('allows %s', (_label, command) => {
    expect(gate(command)).toBe(0);
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
