import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeAll, afterAll, assert } from 'vitest';
import { HANDOVER_MARKER, PR_CHECKLIST, PR_SECTIONS, RISK_TABLE_HEADER } from '../../.github/workflow-rules.mjs';

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

// Every fake bin directory is removed after the file's tests, including those built in it.each tables.
const fakeBins: string[] = [];
afterAll(() => fakeBins.forEach((bin) => fs.rmSync(bin, { recursive: true, force: true })));

// Puts a fake `gh` first on PATH that prints `answer` and exits with `status`, and a fake `git` on `branch`.
const fakeGh = (answer: string, status: number, branch = 'master'): { PATH: string } => {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-gh-'));
  fakeBins.push(bin);
  fs.writeFileSync(path.join(bin, 'answer.json'), answer);
  fs.writeFileSync(path.join(bin, 'gh'), `#!/bin/sh\ncat "${bin}/answer.json"\nexit ${status}\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(bin, 'git'), `#!/bin/sh\necho ${branch}\n`, { mode: 0o755 });
  assert.exists(process.env.PATH);
  return { PATH: `${bin}${path.delimiter}${process.env.PATH}` };
};

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
const repository = {
  issues: {
    pageInfo: { hasNextPage: false },
    nodes: [
      { number: 32, title: '[Epic] E', parent: null, blockedBy: { nodes: [] }, linkedBranches: { nodes: [] } },
      { number: 63, title: '[Task] T', parent: { number: 32 }, blockedBy: { nodes: [] }, linkedBranches: { nodes: [{ ref: { name: 'chore/t' } }] } },
    ],
  },
  issue: { comments: { nodes: [{ body: `${HANDOVER_MARKER}\nNext: tests` }, { body: 'Measured' }] } },
};
const prComment = { createdAt: '2026-10-10T00:00:00Z', body: `${HANDOVER_MARKER}\nFrom PR` };
const pr = { number: 46, closingIssuesReferences: { nodes: [{ number: 63, title: '[Task] T', comments: { nodes: [prComment] } }] } };
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
  ])('prints a stop notice when %s', (_label, env) => {
    expect(run(env)).toContain('PLAN UNAVAILABLE');
  });
});

// The fake `gh` answer for the pr-gate linked-issue lookup, so the tests need no network or token.
const linkedTask = (parent: { number: number } | null): string =>
  JSON.stringify({ data: { repository: { issue: { state: 'OPEN', labels: { nodes: [{ name: 'task' }] }, parent } } } });

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-gate-'));
const goodPr = path.join(dir, 'good-pr.md');
const badPr = path.join(dir, 'bad-pr.md');
const goodIssue = path.join(dir, 'good-issue.md');

const gate = (command: string, ghAnswer = linkedTask({ number: 35 })): { status: number | null; stderr: string } =>
  spawnSync('node', [path.join(process.cwd(), '.claude/hooks/pr-gate.mjs')], {
    input: JSON.stringify({ cwd: dir, tool_input: { command } }),
    env: { ...process.env, ...fakeGh(ghAnswer, 0) },
    encoding: 'utf8',
  });

const filled: Record<string, string> = {
  'Pre-Merge Checklist': PR_CHECKLIST.map((item) => `- [x] ${item}`).join('\n'),
  'Unverified Risks & Metacognition': `${RISK_TABLE_HEADER}\n|---|---|---|---|\n| Safari | Low | Checked | #91 |`,
};
const prBody = PR_SECTIONS.map((s) => `## ${s}\n${s in filled ? filled[s] : '- Closes #44'}`).join('\n');

// A crash also exits 2, so a block must name the gate in its message.
const expectBlocked = (result: { status: number | null; stderr: string }): void => {
  expect(result.status).toBe(2);
  expect(result.stderr).toContain('Blocked by .claude/hooks/pr-gate.mjs');
};

describe('pr-gate hook', () => {
  beforeAll(() => {
    fs.writeFileSync(goodPr, prBody);
    fs.writeFileSync(badPr, read('.github/PULL_REQUEST_TEMPLATE.md'));
    fs.writeFileSync(goodIssue, '### Description\n\nA\n\n### Requirements / Constraints\n\nB\n');
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it.each([
    ['a linked Task without native parent', linkedTask(null)],
    ['a linked PR number instead of an issue', '{"data":{"repository":{"issue":null}}}'],
  ])('blocks a PR with %s', (_label, ghAnswer) => {
    expectBlocked(gate('gh pr create --title "chore: x" --body-file good-pr.md', ghAnswer));
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
    ['the pr new alias', 'gh pr new --title "chore: x" --body "hi"'],
    ['the issue new alias', 'gh issue new -t "[Task] X" -b "hi"'],
    [
      'repeated flags whose last value breaks the rules, because gh uses the last one',
      'gh pr create --title "chore: x" --body-file good-pr.md --title "Add gates" --body-file bad-pr.md',
    ],
    [
      'a body file flag hidden in a quoted title',
      'gh pr create --body-file bad-pr.md --title "chore: pass -F good-pr.md once"',
    ],
    ['a parent hidden in a quoted title', `gh issue create --title '[Task] X --parent 35' --label task --body-file good-issue.md`],
  ])('blocks %s', (_label, command) => {
    expectBlocked(gate(command));
  });

  it.each([
    ['a valid PR', `git push && gh pr create --base master --title 'chore(claude): gate PRs' --body-file good-pr.md`],
    ['a valid issue', 'gh issue create --title "[Task] X" --label task --parent 35 --body-file good-issue.md'],
    ['other commands', 'gh pr view 44'],
    ['text that mentions the command', "git commit -F - <<'EOF'\nchore: gate gh pr create\nEOF"],
  ])('allows %s', (_label, command) => {
    expect(gate(command).status).toBe(0);
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
