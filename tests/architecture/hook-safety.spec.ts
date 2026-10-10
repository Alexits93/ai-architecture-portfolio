import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// A hook whose shared module fails to load must still block (pr-gate) or print the stop notice
// (session-plan); an import error outside the try exits 1, which Claude Code treats as non-blocking.
describe('hooks with a broken workflow-rules.mjs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'broken-rules-'));
  beforeAll(() => {
    fs.mkdirSync(path.join(root, '.claude/hooks'), { recursive: true });
    fs.mkdirSync(path.join(root, '.github'));
    fs.writeFileSync(path.join(root, '.github/workflow-rules.mjs'), 'export const broken = ;\n');
    for (const hook of ['pr-gate.mjs', 'session-plan.mjs']) {
      fs.copyFileSync(path.join(process.cwd(), '.claude/hooks', hook), path.join(root, '.claude/hooks', hook));
    }
  });
  afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

  const runCopy = (hook: string, input: string) =>
    spawnSync(process.execPath, [path.join(root, '.claude/hooks', hook)], { input, encoding: 'utf8' });

  it('pr-gate blocks', () => {
    const result = runCopy('pr-gate.mjs', JSON.stringify({ tool_input: { command: 'gh pr create --title "chore: x"' } }));
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('pr-gate hook crashed, blocking the call');
  });

  it('session-plan prints PLAN UNAVAILABLE', () => {
    expect(runCopy('session-plan.mjs', '').stdout).toContain('PLAN UNAVAILABLE');
  });
});

describe('sandbox-gate with a broken shell-words.mjs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'broken-words-'));
  beforeAll(() => {
    fs.mkdirSync(path.join(root, '.claude/hooks'), { recursive: true });
    fs.copyFileSync(path.join(process.cwd(), '.claude/settings.json'), path.join(root, '.claude/settings.json'));
    fs.copyFileSync(path.join(process.cwd(), '.claude/hooks/sandbox-gate.mjs'), path.join(root, '.claude/hooks/sandbox-gate.mjs'));
    fs.writeFileSync(path.join(root, '.claude/hooks/shell-words.mjs'), 'export const broken = ;\n');
  });
  afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

  it('blocks', () => {
    const result = spawnSync(process.execPath, [path.join(root, '.claude/hooks/sandbox-gate.mjs')], {
      input: JSON.stringify({ tool_input: { command: 'git status' } }),
      encoding: 'utf8',
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('sandbox-gate hook crashed, blocking the call');
  });
});

// base has CLAUDE.md and README.md; gates changes CLAUDE.md (protected), docs changes README.md,
// moved renames CLAUDE.md away. gates.patch and docs.patch hold the gates and docs diffs.
const makeRepo = (): string => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'switch-gate-'));
  const git = (...args: string[]) => spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
  const commitOn = (branch: string, file: string) => {
    git('switch', '-q', '-c', branch, 'base');
    fs.writeFileSync(path.join(repo, file), 'b\n');
    git('commit', '-q', '-am', branch);
  };
  git('init', '-q', '-b', 'base');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
  fs.writeFileSync(path.join(repo, 'CLAUDE.md'), 'a\n');
  fs.writeFileSync(path.join(repo, 'README.md'), 'a\n');
  git('add', '.');
  git('commit', '-q', '-m', 'base');
  commitOn('gates', 'CLAUDE.md');
  commitOn('docs', 'README.md');
  git('switch', '-q', '-c', 'moved', 'base');
  git('mv', 'CLAUDE.md', 'notes.md');
  git('commit', '-q', '-m', 'moved');
  git('switch', '-q', 'base');
  fs.writeFileSync(path.join(repo, 'gates.patch'), git('diff', 'base', 'gates').stdout);
  fs.writeFileSync(path.join(repo, 'docs.patch'), git('diff', 'base', 'docs').stdout);
  git('config', 'alias.sw', 'switch');
  git('config', 'alias.go.command', 'switch');
  git('config', 'alias.shsw', '!git switch');
  return repo;
};

const gate = (command: string, cwd: string) =>
  spawnSync('node', [path.join(process.cwd(), '.claude/hooks/sandbox-gate.mjs')], {
    input: JSON.stringify({ cwd, tool_input: { command } }),
    encoding: 'utf8',
  });

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
});

// Permission rules match the whole command text, so they miss short-flag clusters and deny quoted
// messages (https://code.claude.com/docs/en/permissions). The hook reads the options as git does
// (https://git-scm.com/docs/gitcli): a value option such as -m takes the rest of its cluster.
describe('sandbox-gate hook on hook-skipping and force flags', () => {
  let repo = '';
  const gateIn = (command: string) => gate(command, repo);

  beforeAll(() => {
    repo = makeRepo();
  });
  afterAll(() => fs.rmSync(repo, { recursive: true, force: true }));

  it.each([
    'git commit -an -m x',
    'git commit -nm x',
    'git commit -anm x',
    'git commit --no-verify -m x',
    'git commit --no-veri -m x',
    'git -C . commit -an -m x',
    'git -c alias.ci="commit -n" ci -m x',
    'git push -fu origin b',
    'git push --force origin b',
    'git push --no-verify origin b',
  ])('blocks %s', (command) => {
    const result = gateIn(command);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Blocked by .claude/hooks/sandbox-gate.mjs');
    expect(result.stderr).not.toContain('wip.patch');
  });

  it.each([
    'git push --force-with-lease origin b',
    'git commit -am "fix: -n flag"',
    'git commit -mn',
    'git commit -m -n',
    'git commit -uno -m x',
    'git push -nu origin b',
  ])('allows %s', (command) => {
    expect(gateIn(command).status).toBe(0);
  });
});
