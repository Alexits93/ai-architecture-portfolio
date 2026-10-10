import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { gate, makeRepo } from './sandbox-gate.fixture';

// Each row rewrites CLAUDE.md, the protected file of the makeRepo fixture.
const REWRITES: [string, string][] = [
  ['a switch that changes a protected file', 'git switch gates'],
  ['a checkout that changes a protected file', 'git checkout gates'],
  ['a chained switch', 'git status && git switch gates'],
  ['a rebase', 'git rebase --onto base gates docs'],
  ['a merge', 'git merge gates'],
  ['a cherry-pick', 'git cherry-pick gates'],
  ['a reset', 'git reset --hard gates'],
  ['a restore of a protected file', 'git restore --source=gates CLAUDE.md'],
  ['a restore of the whole tree', 'git restore .'],
  ['a checkout of paths', 'git checkout gates -- .'],
  ['a quoted path', 'git restore "CLAUDE.md"'],
  ['a single-quoted path after --', "git checkout gates -- 'CLAUDE.md'"],
  ['a restore of index and worktree', 'git restore --staged --worktree CLAUDE.md'],
  ['a restore with clustered -SW', 'git restore -SW CLAUDE.md'],
  ['a switch to a branch that renames a protected file away', 'git switch moved'],
  ['an orphan switch, which removes every tracked file', 'git switch --orphan scratch'],
  ['a revert', 'git revert gates'],
  ['a pull', 'git pull'],
  ['an am', 'git am gates.patch'],
  ['an apply of a patch that changes a protected file', 'git apply gates.patch'],
  ['a switch after -c', 'git -c core.quotePath=false switch gates'],
  ['an env-prefixed switch', 'GIT_TRACE=0 git switch gates'],
  ['a switch through env', 'env git switch gates'],
  ['a switch through command', 'command git switch gates'],
  ['an alias', 'git sw gates'],
  ['an alias.<name>.command alias', 'git go gates'],
  ['a shell alias', 'git shsw gates'],
  ['an alias from -c', 'git -c alias.co2=checkout co2 gates'],
  // The hook sees words before shell expansion and git pathspec magic, so it cannot rule them out.
  ['a path from a variable', 'git restore "$F"'],
  ['a glob pathspec', "git restore 'CLAUDE*'"],
  ['a top-level pathspec', "git restore ':/'"],
  ['an apply of a patch the hook cannot read', 'git apply "$P"'],
  // --apply turns patching back on after --check, --stat, --numstat and --summary (https://git-scm.com/docs/git-apply).
  ['an apply check that applies too', 'git apply --check --apply gates.patch'],
  ['an apply stat with the --ap prefix', 'git apply --stat --ap gates.patch'],
  // Bash ends a word at < and >, and - is the previous branch (https://git-scm.com/docs/git-switch).
  ['a switch with a stuck redirect', 'git switch gates>/dev/null'],
  ['a redirect before the target', 'git switch >/dev/null gates'],
  ['a switch to the previous branch, which renames a protected file away', 'git switch -'],
];

// The sandbox mounts sandbox.filesystem.denyWrite paths read-only, so a sandboxed git command that
// rewrites them half-applies. The hook cannot see whether a call is sandboxed (Bash tool_input has no
// such field, https://code.claude.com/docs/en/hooks), so it blocks whenever protected paths would change.
describe('sandbox-gate hook on worktree-rewriting git commands', () => {
  let repo = '';
  const gateIn = (command: string) => gate(command, repo);

  beforeAll(() => {
    repo = makeRepo();
  });
  afterAll(() => fs.rmSync(repo, { recursive: true, force: true }));

  it.each(REWRITES)('blocks %s', (_label, command) => {
    const result = gateIn(command);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Blocked by .claude/hooks/sandbox-gate.mjs');
    expect(result.stderr).toContain('wip.patch');
  });

  it.each([
    ['a switch that changes only unprotected files', 'git switch docs'],
    ['a new branch from HEAD', 'git switch -c feature'],
    ['a restore of an unprotected file', 'git restore README.md'],
    ['an unknown ref, which git rejects itself', 'git switch nope'],
    ['read-only git commands', 'git log --oneline -1'],
    ['a restore of the index only', 'git restore --staged CLAUDE.md'],
    ['a restore of the index only with -S', 'git restore -S CLAUDE.md'],
    ['an alias switch to unprotected changes', 'git sw docs'],
    ['an apply of a patch that changes only unprotected files', 'git apply docs.patch'],
    ['an apply check', 'git apply --check gates.patch'],
    ['an apply check of a patch in a variable', 'git apply --check "$TMPDIR/wip.patch"'],
    ['a restore of the index only from a variable', 'git restore --staged "$F"'],
    ['a mixed reset of a glob, which leaves the worktree alone', "git reset -- '*.ts'"],
    ['a command lookup', 'command -v git'],
  ])('allows %s', (_label, command) => {
    expect(gateIn(command).status).toBe(0);
  });
});

// From outside the repo, the gate sees it only through the same options git gets.
describe('sandbox-gate hook on git calls that name the repo', () => {
  let repo = '';
  beforeAll(() => {
    repo = makeRepo();
  });
  afterAll(() => fs.rmSync(repo, { recursive: true, force: true }));

  it.each([
    ['-C', (repoDir: string) => `git -C ${repoDir} switch gates`],
    ['--git-dir and --work-tree', (repoDir: string) => `git --git-dir=${repoDir}/.git --work-tree=${repoDir} switch gates`],
    ['GIT_DIR and GIT_WORK_TREE', (repoDir: string) => `GIT_DIR=${repoDir}/.git GIT_WORK_TREE=${repoDir} git switch gates`],
  ])('blocks a switch that reaches the repo through %s', (_label, command) => {
    expect(gate(command(repo), path.dirname(repo)).status).toBe(2);
  });

  it('allows a switch through -C to unprotected changes', () => {
    expect(gate(`git -C ${repo} switch docs`, path.dirname(repo)).status).toBe(0);
  });

  // env -C (coreutils 9.12) and cd move the directory git runs in; --attr-source takes a value (git(1) 2.56.0).
  it.each([
    ['env -C', (repoDir: string) => `env -C ${repoDir} git switch gates`],
    ['env --chdir=', (repoDir: string) => `env --chdir=${repoDir} git switch gates`],
    ['cd', (repoDir: string) => `cd ${repoDir} && git switch gates`],
    ['cd into a quoted variable', () => 'cd "$REPO" && git switch gates'],
  ])('blocks a switch that reaches the repo through %s', (_label, command) => {
    expect(gate(command(repo), path.dirname(repo), { REPO: repo }).status).toBe(2);
  });

  it('blocks a switch after --attr-source', () => {
    expect(gate('git --attr-source HEAD switch gates', repo).status).toBe(2);
  });
});

// Only the project's repo has read-only paths: the sandbox mounts denyWrite relative to the project, and
// CLAUDE_PROJECT_DIR stays at the session's project root (https://code.claude.com/docs/en/hooks).
describe('sandbox-gate hook on other repos', () => {
  let repo = '';
  let scratch = '';
  beforeAll(() => {
    repo = makeRepo();
    scratch = makeRepo();
  });
  afterAll(() => {
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(scratch, { recursive: true, force: true });
  });

  it('allows rewriting a protected path in a scratch repo after cd', () => {
    expect(gate(`cd ${scratch} && git checkout -- CLAUDE.md`, repo, { CLAUDE_PROJECT_DIR: repo }).status).toBe(0);
  });

  it('blocks a rewrite in the project repo after cd back', () => {
    expect(gate(`cd ${scratch} && cd ${repo} && git switch gates`, path.dirname(repo), { CLAUDE_PROJECT_DIR: repo }).status).toBe(2);
  });

  it('blocks a rewrite in a worktree of the project repo', () => {
    const tree = path.join(path.dirname(repo), `${path.basename(repo)}-tree`);
    spawnSync('git', ['worktree', 'add', '-q', '--detach', tree, 'base'], { cwd: repo });
    try {
      expect(gate('git switch gates', tree, { CLAUDE_PROJECT_DIR: repo }).status).toBe(2);
    } finally {
      fs.rmSync(tree, { recursive: true, force: true });
    }
  });
});

// The hook lists a patch with git apply itself, outside the sandbox, so it must never pass --apply on.
describe('sandbox-gate hook on git apply --apply', () => {
  let repo = '';
  beforeAll(() => {
    repo = makeRepo();
  });
  afterAll(() => fs.rmSync(repo, { recursive: true, force: true }));

  it('blocks without applying the patch itself', () => {
    expect(gate('git apply --apply gates.patch', repo).status).toBe(2);
    expect(fs.readFileSync(path.join(repo, 'CLAUDE.md'), 'utf8')).toBe('a\n');
  });

  // --build-fake-ancestor writes an index file even in the listing modes.
  it('does not write a fake ancestor file itself', () => {
    gate('git apply --build-fake-ancestor=fake.idx docs.patch', repo);
    gate('git apply --bu=fake.idx docs.patch', repo);
    expect(fs.existsSync(path.join(repo, 'fake.idx'))).toBe(false);
  });
});
