import * as fs from 'fs';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { gate, makeRepo } from './sandbox-gate.fixture';

// Every shell form that runs git (bash(1) 5.3.20: RESERVED WORDS, SHELL GRAMMAR, Command Substitution,
// Process Substitution, Here Documents, OPTIONS; fish(1) -c). Interpreters and script files stay out:
// the command text does not show what they run (#95).
const RUNS_GIT = [
  'eval "git commit -n -m x"',
  'eval git commit -n -m x',
  'sh -c "git commit -n -m x"',
  "bash -c 'git commit -n -m x'",
  "bash -lc 'git commit -n -m x'",
  "bash -o pipefail -c 'git commit -n -m x'",
  "/bin/bash -c 'git commit -n -m x'",
  "zsh -c 'git commit -n -m x'",
  "fish -c 'git commit -n -m x'",
  '(git commit -m x -n)',
  '( git commit -m x -n )',
  '{ git commit -m x -n; }',
  'if true; then git commit -m x -n; fi',
  'while false; do git commit -m x -n; done',
  'for i in 1; do git commit -m x -n; done',
  'case a in a) git commit -m x -n;; esac',
  '! git commit -m x -n',
  'coproc git commit -m x -n',
  'f() { git commit -m x -n; }; f',
  'echo $(git commit -m x -n)',
  'echo "$(git commit -m x -n)"',
  'echo `git commit -m x -n`',
  'echo "`git commit -m x -n`"',
  'cat <(git commit -m x -n)',
  'cat <<EOF\n$(git commit -m x -n)\nEOF',
  "trap 'git commit -m x -n' EXIT",
  "script -qc 'git commit -n -m x' /dev/null",
  'g=git; $g commit -n -m x',
  '$unset_name commit -n -m x',
  'sudo git commit -n -m x',
  'watch -n1 git commit -n -m x',
  'setsid git commit -n -m x',
  'flock /tmp/l git commit -n -m x',
  'ionice -c3 git commit -n -m x',
  'chrt -i 0 git commit -n -m x',
  'taskset 1 git commit -n -m x',
  'pnpm exec git commit -n -m x',
  'find . -maxdepth 0 -exec git commit -n -m x \\;',
  "echo 'git commit -n -m x' | bash",
  "bash <<< 'git commit -n -m x'",
  "bash <<'EOF'\ngit commit -n -m x\nEOF",
  'git push --delete origin master',
  'git push -d origin master',
  'git push origin :master',
  'git push --prune origin',
  '$(echo git) commit -n -m x',
  'true; `echo git` commit -n -m x',
  // --exec-path and GIT_EXEC_PATH pick the git-commit program; include.path loads more config (git(1),
  // git-config(1) 2.56.0, Includes).
  'git --exec-path=/tmp/x commit -m x',
  'GIT_EXEC_PATH=/tmp/x git commit -m x',
  'git -c include.path=/tmp/c commit -m x',
  'git -c includeIf.gitdir:/.path=/tmp/c push origin b',
  // Brace expansion builds the name or a flag (bash(1), Brace Expansion).
  '{git,} commit -n -m x',
  'git commit {-n,} -m x',
  // Substitutions in a quoted redirect target, eval of built text, and source of a process substitution.
  'read -r x <<< "$(git commit -n -m x)"',
  'echo > "$(git commit -n -m x)"',
  'cat >(git commit -n -m x)',
  'eval $(cat x)',
  'eval "$CMD"',
  'source <(cat x)',
  '. <(cat x)',
  'source /dev/stdin <<< x',
  "$'git' commit -n -m x",
  // A PATH that puts another git first; zsh's =git, - and nocorrect (zshexpn(1), zshmisc(1)).
  'PATH=/tmp/x:$PATH git commit -m x',
  '=git commit -n -m x',
  '- git commit -n -m x',
  'nocorrect git commit -n -m x',
  '"$(which git)" commit -n -m x',
  'a=(git commit -n -m x); "${a[@]}"',
  // xargs appends words from stdin (xargs(1) 4.11.0); config values and env that git runs as commands
  // (https://code.claude.com/docs/en/permissions names core.fsmonitor).
  'echo -n | xargs git commit -m x',
  'xargs git < args.txt',
  'git -c core.fsmonitor="git commit -n -m x" status',
  'GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0="git commit -n -m x" git status',
  'git -c core.editor="git commit -n -m x" commit --amend',
  'git submodule foreach "git commit -n -m x"',
  'for c in ls git; do $c commit -n -m x; done',
  'for c in $(cat x); do $c commit -n -m x; done',
];

const DATA = [
  'git commit -m "docs: why git push -f is blocked"',
  "cat > x.md <<'EOF'\n| `git checkout -- CLAUDE.md` | blocked |\nEOF",
  "cat > x.md <<-\"EOF\"\n\tgit checkout -- CLAUDE.md\n\tEOF",
  `git commit -m "$(cat <<'EOF'\nfix: x\n\ngit push -f is blocked\nEOF\n)"`,
  'grep -rn "bash -c" src',
  'grep -c bash README.md',
  'echo "$(git log -1 --format=%H)"',
  'bash -n ./x.sh',
  'git push origin b',
  'git push origin b:refs/heads/b',
  'cd "$TMPDIR" && ls',
  'git ls-files | xargs grep -n x',
  'git ls-files | xargs git log -1',
  'git -c core.pager=cat log -1',
  'git commit -m "fix: a=b c"',
  'git commit -m "git push -f is blocked"',
  'git commit --message="git push -f is blocked"',
  'echo "git push -f is blocked" > /dev/null',
  'gh issue comment 1 --body "git push -f is blocked"',
  'for c in timeout nice; do $c --help | head -3; done',
];

describe('sandbox-gate hook on shell forms that run git', () => {
  let repo = '';
  beforeAll(() => {
    repo = makeRepo();
  });
  afterAll(() => fs.rmSync(repo, { recursive: true, force: true }));

  it.each(RUNS_GIT)('blocks %s', (command) => {
    const result = gate(command, repo);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Blocked by .claude/hooks/sandbox-gate.mjs');
  });

  it.each(DATA)('allows %s', (command) => {
    expect(gate(command, repo).status).toBe(0);
  });
});
