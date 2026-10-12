import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PR_CHECKLIST, PR_SECTIONS, RISK_TABLE_HEADER } from '../../.github/workflow-rules.mjs';
import { connection, fakeGh, planIssue, removeFakeBins } from './fake-gh.fixture';

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

// The fake `gh` answer for the pr-gate lookups, so the tests need no network or token: the linked-issue
// lookup reads `issue`, the branch link lookup reads `issues`. #72 is linked to branch ci/x, #44 to ci/y.
const branchLinks = connection([planIssue({ number: 72, title: '', parent: null }, ['ci/x']), planIssue({ number: 44, title: '', parent: null }, ['ci/y'])]);
const linkedTask = (parent: { number: number } | null, issues = branchLinks): string =>
  JSON.stringify({ data: { repository: { issue: { state: 'OPEN', labels: connection([{ name: 'task' }]), parent }, issues } } });

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-gate-'));
const goodPr = path.join(dir, 'good-pr.md');
const badPr = path.join(dir, 'bad-pr.md');
const goodIssue = path.join(dir, 'good-issue.md');

const gate = (command: string, ghAnswer = linkedTask({ number: 35 }), branch = 'master'): { status: number | null; stderr: string } =>
  spawnSync('node', [path.join(process.cwd(), '.claude/hooks/pr-gate.mjs')], {
    input: JSON.stringify({ cwd: dir, tool_input: { command } }),
    env: { ...process.env, ...fakeGh(ghAnswer, 0, branch) },
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

const validPr = `gh pr create --base master --title 'chore(claude): gate PRs' --body-file good-pr.md`;

beforeAll(() => {
  fs.writeFileSync(goodPr, prBody);
  fs.writeFileSync(badPr, read('.github/PULL_REQUEST_TEMPLATE.md'));
  fs.writeFileSync(goodIssue, '### Description\n\nA\n\n### Requirements / Constraints\n\nB\n');
});
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  removeFakeBins();
});

// GitHub closes the issue a branch was created for when the PR merges, whatever the body says (#185).
describe('pr-gate hook on branch links', () => {
  it.each([
    ['current branch', validPr, 'ci/x'],
    ['--head branch', `${validPr} --head ci/x`, 'master'],
  ])('blocks a PR whose %s is linked to an issue the body does not close, and names it', (_label, command, branch) => {
    const result = gate(command, linkedTask({ number: 35 }), branch);
    expectBlocked(result);
    expect(result.stderr).toContain('#72');
  });

  it('blocks a PR when the open issues exceed one page', () => {
    const truncated = linkedTask({ number: 35 }, { ...branchLinks, pageInfo: { hasNextPage: true, hasPreviousPage: false } });
    expectBlocked(gate(validPr, truncated));
  });

  it('allows a PR from a branch linked to the issue it closes', () => {
    expect(gate(validPr, linkedTask({ number: 35 }), 'ci/y').status).toBe(0);
  });
});

describe('pr-gate hook', () => {
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
    ['a valid PR from a branch without linked issue', `git push && ${validPr}`],
    ['a valid issue', 'gh issue create --title "[Task] X" --label task --parent 35 --body-file good-issue.md'],
    ['other commands', 'gh pr view 44'],
    ['text that mentions the command', "git commit -F - <<'EOF'\nchore: gate gh pr create\nEOF"],
  ])('allows %s', (_label, command) => {
    expect(gate(command).status).toBe(0);
  });
});
