// git commit and git push calls that skip hooks or force-push, for sandbox-gate.mjs. Imported inside
// the hook's try, so a broken module blocks instead of failing open.
import { freeWords, optionsOf } from './shell-words.mjs';

// git accepts any unambiguous prefix of a long option, so --no-veri is --no-verify and --ap is --apply.
export const longOption = (name, shortest) => (option) => option.length >= shortest && name.startsWith(option);
const skipsHooks = (options) => options.some(longOption('--no-verify', '--no-v'.length));

// The shell expands $, $'..', backticks and braces such as {-n,} after the hook reads the word, so it may
// become a flag (bash(1) 5.3.20, Brace Expansion).
export const EXPANDS = /[$`]|\{[^{}]*(,|\.\.)[^{}]*\}/;
// Config from -c or --config-env (https://git-scm.com/docs/git) that moves the hooks or forces the push
// (remote.<name>.mirror, a + refspec, https://git-scm.com/docs/git-push), and the env that sets config
// (GIT_CONFIG_*, git-config(1) 2.56.0) or that husky reads to skip the hooks or source another init.sh
// (https://typicode.github.io/husky/how-to.html).
// --exec-path and GIT_EXEC_PATH choose the git-commit program, and include.path or includeIf.<cond>.path
// load another config file (git(1), git-config(1) 2.56.0, Includes).
const CONFIG = /hookspath|\.mirror|\.push=\+|^--exec-path|^include/i;
// PATH may put another git first.
export const HOOK_ENV = /^(HUSKY|HOME|XDG_CONFIG_HOME|GIT_CONFIG_\w*|GIT_EXEC_PATH|PATH)=/;
// An assignment anywhere in the line counts, since export HUSKY=0 before git reaches it too.
export const setsHookEnv = (outer, commands) => outer || commands.flat().some((word) => HOOK_ENV.test(word));

const commitFlag = ({ options }) => (options.includes('-n') || skipsHooks(options) ? 'skips the commit hooks' : null);

const forces = ({ options, positionals }) =>
  options.includes('-f') ||
  options.includes('--force') ||
  options.some(longOption('--mirror', '--m'.length)) ||
  positionals.some((p) => p.startsWith('+'));

// --delete (-d), --prune and an empty source (:<dst>) delete remote refs (https://git-scm.com/docs/git-push).
const deletes = ({ options, positionals }) =>
  options.includes('-d') ||
  options.some(longOption('--delete', '--del'.length)) ||
  options.some(longOption('--prune', '--pru'.length)) ||
  positionals.some((p) => p.startsWith(':'));

const pushFlag = (words) => {
  if (skipsHooks(words.options)) return 'skips the pre-push hook';
  if (deletes(words)) return 'deletes remote refs';
  return forces(words) ? 'force-pushes without a lease' : null;
};

// git-commit: -m -F -C -c -t take a value, -u -S -U an optional stuck one; -n is --no-verify.
// git-push: -o takes a value; -n is --dry-run, -f is --force; --mirror and a + refspec force too.
export const FLAGS = new Map([
  ['commit', { valued: 'mFCct', optional: 'uSU', reason: commitFlag }],
  ['push', { valued: 'o', optional: '', reason: pushFlag }],
]);

/** @returns {string | null} why the commit or push call is blocked, or null */
export const flagReason = (call, args) => {
  const { valued, optional, reason } = FLAGS.get(call.sub);
  const options = optionsOf(args, valued, optional);
  const positionals = freeWords(args, valued, optional).filter((word) => !word.startsWith('-'));
  const expanded = [...options, ...positionals].filter((word) => EXPANDS.test(word));
  if (expanded.length > 0) return `names ${expanded.join(', ')}, which the shell expands after the hook reads it`;
  if (call.hookEnv || call.globals.some((word) => CONFIG.test(word))) return 'sets config or env that skips the hooks or forces the push';
  return reason({ options, positionals });
};
