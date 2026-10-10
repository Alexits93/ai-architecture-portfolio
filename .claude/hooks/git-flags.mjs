// git commit and git push calls that skip hooks or force-push, for sandbox-gate.mjs. Imported inside
// the hook's try, so a broken module blocks instead of failing open.
import { freeWords, optionsOf } from './shell-words.mjs';

// git accepts any unambiguous prefix of a long option, so --no-veri is --no-verify and --ap is --apply.
export const longOption = (name, shortest) => (option) => option.length >= shortest && name.startsWith(option);
const skipsHooks = (options) => options.some(longOption('--no-verify', '--no-v'.length));

// The shell expands $, $'..' and backticks after the hook reads the word, so it may become a flag.
export const EXPANDS = /[$`]/;
// Config from -c or --config-env (https://git-scm.com/docs/git) that moves the hooks or forces the push
// (remote.<name>.mirror, a + refspec, https://git-scm.com/docs/git-push), and the env that sets config
// (GIT_CONFIG_*, git-config(1) 2.56.0) or that husky reads to skip the hooks or source another init.sh
// (https://typicode.github.io/husky/how-to.html).
const CONFIG = /hookspath|\.mirror|\.push=\+/i;
export const HOOK_ENV = /^(HUSKY|HOME|XDG_CONFIG_HOME|GIT_CONFIG_\w*)=/;
// An assignment anywhere in the line counts, since export HUSKY=0 before git reaches it too.
export const setsHookEnv = (outer, commands) => outer || commands.flat().some((word) => HOOK_ENV.test(word));

const commitFlag = ({ options }) => (options.includes('-n') || skipsHooks(options) ? 'skips the commit hooks' : null);

const forces = ({ options, positionals }) =>
  options.includes('-f') ||
  options.includes('--force') ||
  options.some(longOption('--mirror', '--m'.length)) ||
  positionals.some((p) => p.startsWith('+'));

const pushFlag = (words) => {
  if (skipsHooks(words.options)) return 'skips the pre-push hook';
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
