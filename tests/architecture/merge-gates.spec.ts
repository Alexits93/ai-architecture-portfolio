import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { gate, makeRepo } from './sandbox-gate.fixture';

// The repo is private on GitHub Free, so no branch protection exists: the owner's review is the only
// server-side gate, and Claude never merges or pushes to master (#55). Bash rules are no security
// boundary (https://code.claude.com/docs/en/permissions#bash-rule-limits), so the hooks repeat them.
const settings: { permissions: { ask: string[]; deny: string[] } } = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), '.claude/settings.json'), 'utf8'),
);

it('denies gh pr merge instead of asking for it', () => {
  const rule = 'Bash(gh pr merge *)';
  expect([settings.permissions.deny.includes(rule), settings.permissions.ask.includes(rule)]).toEqual([true, false]);
});

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-gate-'));
const prGate = (command: string): { status: number | null; stderr: string } =>
  spawnSync('node', [path.join(process.cwd(), '.claude/hooks/pr-gate.mjs')], {
    input: JSON.stringify({ cwd: dir, tool_input: { command } }),
    encoding: 'utf8',
  });

// REST: https://docs.github.com/en/rest/pulls/pulls#merge-a-pull-request and
// https://docs.github.com/en/rest/branches/branches#merge-a-branch. GraphQL mutations by name.
describe('pr-gate on merges', () => {
  beforeAll(() => {
    fs.writeFileSync(path.join(dir, 'merge.graphql'), 'mutation { mergePullRequest(input: {pullRequestId: "x"}) { clientMutationId } }');
    fs.writeFileSync(path.join(dir, 'read.graphql'), 'query { viewer { login } }');
    fs.writeFileSync(path.join(dir, 'merge.json'), '{"query":"mutation { enablePullRequestAutoMerge(input: {}) { clientMutationId } }"}');
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it.each([
    'gh pr merge 12 --squash',
    'cd x && gh pr merge 12 --auto',
    'GH_PAGER= gh pr merge',
    'gh api -X PUT repos/o/r/pulls/12/merge',
    'gh api -X PUT repos/o/r/pulls/12/merge-async',
    'gh api --method PUT /repos/{owner}/{repo}/pulls/12/merge',
    'gh api repos/{owner}/{repo}/merges -f base=master -f head=b',
    `gh api graphql -f query='mutation { mergePullRequest(input: {}) { clientMutationId } }'`,
    `gh api graphql -f query='mutation { enablePullRequestAutoMerge(input: {}) { clientMutationId } }'`,
    `gh api graphql -f query='mutation { mergeBranch(input: {}) { clientMutationId } }'`,
    'gh api graphql -F query=@merge.graphql',
    'gh api graphql --input merge.json',
    'gh api graphql -F query=@-',
    'gh api graphql -F query=@missing.graphql',
    `gh alias set m 'pr merge'`,
    'gh alias import aliases.yml',
  ])('blocks %s', (command) => {
    const result = prGate(command);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Blocked by .claude/hooks/pr-gate.mjs');
  });

  it.each([
    'gh pr view 12',
    'gh pr checks 12 --watch',
    'gh api repos/o/r/pulls/12',
    'gh api -X PUT repos/o/r/pulls/12/update-branch',
    `gh api graphql -f query='query { viewer { login } }'`,
    'gh api graphql -F query=@read.graphql',
    'gh alias list',
    'git commit -m "docs: never run gh pr merge"',
  ])('allows %s', (command) => {
    expect(prGate(command).status).toBe(0);
  });
});

// A refspec's destination is the part after the colon, or the source itself; HEAD is the current branch;
// with no refspec, push.default=simple pushes the current branch; --all and --branches push every branch;
// a word after -- is still a refspec (https://git-scm.com/docs/git-push, git 2.56.0).
const BLOCKED_ANYWHERE = [
  'git push origin HEAD:master',
  'git push origin b:refs/heads/master',
  'git push origin master',
  'git push origin refs/heads/master',
  'git push origin heads/master',
  'git push -u origin b:master',
  'git push --repo=origin master',
  'git push origin -- b:master',
  'git push origin -- +b',
  'git push origin -- :b',
  `git push origin 'refs/heads/*:refs/heads/*'`,
  'git push --all origin',
  'git push --branches origin',
  'git push --al origin',
  'git -c push.default=matching push',
  'git -c remote.origin.push=HEAD:master push',
];
const ALLOWED_OFF_MASTER = [
  'git push',
  'git push origin',
  'git push origin HEAD',
  'git push -u origin gates',
  'git push origin feat/master-notes',
  'git push origin master-notes:master-notes',
  'git push --force-with-lease origin gates',
];

describe('sandbox-gate on pushes to master', () => {
  let repo = '';
  let onMaster = '';

  beforeAll(() => {
    repo = makeRepo();
    onMaster = makeRepo();
    spawnSync('git', ['switch', '-q', '-c', 'master'], { cwd: onMaster });
  });
  afterAll(() => {
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(onMaster, { recursive: true, force: true });
  });

  const expectBlocked = (result: { status: number | null; stderr: string }) => {
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Blocked by .claude/hooks/sandbox-gate.mjs');
  };

  it.each(BLOCKED_ANYWHERE)('blocks %s on another branch', (command) => {
    expectBlocked(gate(command, repo));
  });

  it.each(['git push', 'git push origin', 'git push origin HEAD', 'git push -u origin @'])('blocks %s on master', (command) => {
    expectBlocked(gate(command, onMaster));
  });

  it.each(ALLOWED_OFF_MASTER)('allows %s on another branch', (command) => {
    expect(gate(command, repo).status).toBe(0);
  });
});

// pull_request_target runs the workflow file from master and checks out master, so a PR cannot weaken
// the rules that check it. Its code never runs, untrusted text reaches scripts only through env or the
// github-script context, and the token stays read-only
// (https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request_target,
// https://docs.github.com/en/actions/reference/security/secure-use).
describe('pr-lint workflow', () => {
  const workflow = fs.readFileSync(path.join(process.cwd(), '.github/workflows/pr-lint.yml'), 'utf8');

  it('runs on pull_request_target only', () => {
    expect(workflow).toMatch(/^on:\n {2}pull_request_target:\n {4}types: \[opened, edited, synchronize, reopened\]\n\n/m);
    expect(workflow).not.toMatch(/^\s+pull_request:/m);
  });

  it('keeps a read-only token and no secrets', () => {
    expect(workflow).toMatch(/^permissions:\n {2}contents: read\n {2}issues: read\n {2}pull-requests: read\n\n/m);
    expect(workflow).not.toMatch(/: write|secrets\./);
  });

  it('checks out master without stored credentials', () => {
    expect(workflow).toMatch(/^\s+persist-credentials: false$/m);
    expect(workflow).not.toMatch(/^\s+ref:/m);
  });

  it('never expands an expression inside a run script', () => {
    expect(workflow.split('\n').filter((line) => /^\s+run:/.test(line) && line.includes('${{'))).toEqual([]);
  });
});
