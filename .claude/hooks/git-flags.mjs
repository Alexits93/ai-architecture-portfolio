// git commit and git push calls that skip hooks, force-push or push to master, for sandbox-gate.mjs.
// Imported inside the hook's try, so a broken module blocks instead of failing open.
import { spawnSync } from 'node:child_process';
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
// remote.<name>.push and push.default choose what a push without refspec updates.
const CONFIG = /hookspath|\.mirror|\.push=|push\.default|^--exec-path|^include/i;
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
// --de is the shortest prefix git reads as --delete: --dry-run also starts with --d (git push -h, 2.56.0).
const deletes = ({ options, positionals }) =>
  options.includes('-d') ||
  options.some(longOption('--delete', '--de'.length)) ||
  options.some(longOption('--prune', '--pru'.length)) ||
  positionals.some((p) => p.startsWith(':'));

const gitOut = (call, args) => {
  const result = spawnSync('git', [...call.globals, ...args], { cwd: call.cwd, env: call.env, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
};

// The owner's review is the only gate before master (#55). git-push (2.56.0): the destination of a refspec
// is the part after the colon, or the source itself; HEAD and @ name the current branch; a pattern refspec,
// --all and --branches update every branch; without a refspec, push.default=simple pushes the current
// branch, while matching and upstream may update master from another branch.
const MASTER = /^(?:refs\/)?(?:heads\/)?master$/;
const destination = (refspec, current) => {
  const spec = refspec.replace(/^\+/, '');
  const dst = spec.includes(':') ? spec.slice(spec.indexOf(':') + 1) : spec;
  return dst === 'HEAD' || dst === '@' ? current : dst;
};
const allBranches = (options) => options.some(longOption('--all', '--al'.length)) || options.some(longOption('--branches', '--b'.length));
// --repo=<remote> names the remote, so every positional is a refspec.
const refspecsOf = ({ options, positionals }) => (options.some(longOption('--repo', '--rep'.length)) ? positionals : positionals.slice(1));
const defaultPush = (call, current) =>
  current === 'master' || ['matching', 'upstream', 'tracking'].includes(gitOut(call, ['config', '--get', 'push.default']) ?? 'simple');

const pushesMaster = (words, call) => {
  if (allBranches(words.options)) return true;
  const current = gitOut(call, ['symbolic-ref', '--short', '-q', 'HEAD']);
  const refspecs = refspecsOf(words);
  if (refspecs.length === 0) return defaultPush(call, current);
  return refspecs.map((refspec) => destination(refspec, current)).some((dst) => MASTER.test(dst ?? '') || dst?.includes('*'));
};

const pushFlag = (words, call) => {
  if (skipsHooks(words.options)) return 'skips the pre-push hook';
  if (deletes(words)) return 'deletes remote refs';
  if (forces(words)) return 'force-pushes without a lease';
  return pushesMaster(words, call) ? 'pushes to master, which only the owner updates by merging a PR' : null;
};

// git-commit: -m -F -C -c -t take a value, -u -S -U an optional stuck one; -n is --no-verify.
// git-push: -o takes a value; -n is --dry-run, -f is --force; --mirror and a + refspec force too.
// A push reads every word after -- as a refspec; a commit reads them as paths.
export const FLAGS = new Map([
  ['commit', { valued: 'mFCct', optional: 'uSU', reason: commitFlag, afterDash: false }],
  ['push', { valued: 'o', optional: '', reason: pushFlag, afterDash: true }],
]);

const afterDash = (args) => (args.includes('--') ? args.slice(args.indexOf('--') + 1) : []);

/** @returns {string | null} why the commit or push call is blocked, or null */
export const flagReason = (call, args) => {
  const { valued, optional, reason, afterDash: refspecsAfterDash } = FLAGS.get(call.sub);
  const options = optionsOf(args, valued, optional);
  const positionals = [
    ...freeWords(args, valued, optional).filter((word) => !word.startsWith('-')),
    ...(refspecsAfterDash ? afterDash(args) : []),
  ];
  const expanded = [...options, ...positionals].filter((word) => EXPANDS.test(word));
  if (expanded.length > 0) return `names ${expanded.join(', ')}, which the shell expands after the hook reads it`;
  if (call.hookEnv || call.globals.some((word) => CONFIG.test(word))) return 'sets config or env that skips the hooks or redirects the push';
  return reason({ options, positionals }, call);
};
