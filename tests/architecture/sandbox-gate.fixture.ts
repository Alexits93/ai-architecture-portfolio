import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// base has CLAUDE.md and README.md; gates changes CLAUDE.md (protected), docs changes README.md,
// moved renames CLAUDE.md away. gates.patch and docs.patch hold the gates and docs diffs.
export const makeRepo = (): string => {
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

export const gate = (command: string, cwd: string) =>
  spawnSync('node', [path.join(process.cwd(), '.claude/hooks/sandbox-gate.mjs')], {
    input: JSON.stringify({ cwd, tool_input: { command } }),
    encoding: 'utf8',
  });
