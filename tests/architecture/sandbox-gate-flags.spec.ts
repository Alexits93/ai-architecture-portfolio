import * as fs from 'fs';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { gate, makeRepo } from './sandbox-gate.fixture';

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

// The shell expands $, $'..' and backslash-newline and splits words at < and > after the hook reads them,
// so a word that still holds one may become a flag (bash(1) 5.3, QUOTING and REDIRECTION).
// core.hooksPath (also through -c, --config-env, https://git-scm.com/docs/git, and GIT_CONFIG_*,
// git-config(1) 2.56.0) points the hooks elsewhere; husky skips them on HUSKY=0 and sources init.sh from
// $XDG_CONFIG_HOME or $HOME (https://typicode.github.io/husky/how-to.html). A + refspec, --mirror and
// remote.<name>.mirror force-push (https://git-scm.com/docs/git-push).
const HOOK_SKIPS = [
  "git commit $'--no-verify' -m x",
  'git commit \\\n--no-verify -m x',
  'git commit --no-verify>/dev/null -m x',
  'f=--no-verify; git commit $f -m x',
  'git commit -a$f -m x',
  'git $c -m x',
  'git -c core.hooksPath=/dev/null commit -m x',
  'git -c core.hookspath=/dev/null push origin b',
  'H=/dev/null git --config-env=core.hooksPath=H commit -m x',
  'GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.hooksPath GIT_CONFIG_VALUE_0=/dev/null git commit -m x',
  'HUSKY=0 git commit -m x',
  'export HUSKY=0; git commit -m x',
  'HOME=/tmp/x git commit -m x',
  'XDG_CONFIG_HOME=/tmp/x git push origin b',
  'git push origin +b',
  'git push origin +HEAD:master',
  'git push --mirror',
  'git push --mirr origin',
  'git -c remote.origin.mirror=true push origin',
  'git -c remote.origin.push=+HEAD:master push origin',
];

const HOOK_RUNS = [
  `git commit -m "$(cat <<'EOF'\nfix: x\nEOF\n)"`,
  'git commit -m"$msg"',
  'git commit -F "$TMPDIR/msg"',
  'git -c user.name=x commit -m x',
  'git -c push.autoSetupRemote=true push origin b',
  'git push origin b:refs/heads/b',
  'git log -1 "$ref"',
];

describe('sandbox-gate hook on other ways to skip hooks or force-push', () => {
  let repo = '';
  beforeAll(() => {
    repo = makeRepo();
  });
  afterAll(() => fs.rmSync(repo, { recursive: true, force: true }));

  it.each(HOOK_SKIPS)('blocks %s', (command) => {
    const result = gate(command, repo);
    expect(result.status).toBe(2);
    expect(result.stderr).not.toContain('wip.patch');
  });

  it.each(HOOK_RUNS)('allows %s', (command) => {
    expect(gate(command, repo).status).toBe(0);
  });
});
