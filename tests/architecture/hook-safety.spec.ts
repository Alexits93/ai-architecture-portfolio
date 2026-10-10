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

// base has CLAUDE.md and README.md; gates changes CLAUDE.md (protected), docs changes README.md.
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
  git('switch', '-q', 'base');
  return repo;
};

// The sandbox mounts sandbox.filesystem.denyWrite paths read-only, so a sandboxed git command that
// rewrites them half-applies. The hook cannot see whether a call is sandboxed (Bash tool_input has no
// such field, https://code.claude.com/docs/en/hooks), so it blocks whenever protected paths would change.
describe('sandbox-gate hook on worktree-rewriting git commands', () => {
  let repo = '';
  const gateIn = (command: string) =>
    spawnSync('node', [path.join(process.cwd(), '.claude/hooks/sandbox-gate.mjs')], {
      input: JSON.stringify({ cwd: repo, tool_input: { command } }),
      encoding: 'utf8',
    });

  beforeAll(() => {
    repo = makeRepo();
  });
  afterAll(() => fs.rmSync(repo, { recursive: true, force: true }));

  it.each([
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
  ])('blocks %s', (_label, command) => {
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
  ])('allows %s', (_label, command) => {
    expect(gateIn(command).status).toBe(0);
  });
});
