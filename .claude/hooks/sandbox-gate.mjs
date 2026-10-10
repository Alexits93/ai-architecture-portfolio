// PreToolUse hook (Bash): sandbox.excludedCommands run unsandboxed only as a standalone call.
// A cd, chain, pipe, redirect or substitution keeps the whole call sandboxed
// (https://code.claude.com/docs/en/sandboxing), so it fails and invites an unsandboxed retry that
// widens far more than the one command. This hook blocks those calls instead.
// It also blocks git calls that skip hooks or force-push, which permission rules cannot match in a
// short-flag cluster (https://code.claude.com/docs/en/permissions). The deny rules in settings.json cover
// the subshell forms Claude Code checks before matching. Neither is a security boundary: eval, sh -c and
// bash -c still pass (#94).
// Exit 2 blocks the tool call and sends stderr to Claude. A crash, including a failed import, also
// exits 2, so the gate never fails open.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';

// Loaded inside the try below: a static import that fails would exit 1, which does not block.
/** @type {typeof import('./shell-words.mjs')} */
let shell;
/** @type {typeof import('./git-flags.mjs')} */
let flags;
/** @type {typeof import('./wrappers.mjs')} */
let wrappers;
// Git common dir of CLAUDE_PROJECT_DIR (https://code.claude.com/docs/en/hooks): worktrees count; unset, every repo does.
let project = null;

// The sandbox mounts sandbox.filesystem.denyWrite read-only, so a sandboxed git command that rewrites
// one of those paths half-applies. The hook cannot tell whether a call is sandboxed (the Bash tool_input
// has no such field, https://code.claude.com/docs/en/hooks), so it blocks whenever a protected path would
// change; the owner then runs the command with `! git ...`.
const HARD_RESET = new Set(['--hard', '--merge', '--keep']);
const CREATE = new Set(['-c', '-C', '-b', '-B', '--create', '--force-create', '--orphan']);
// git apply modes that leave the worktree alone.
const APPLY_READ_ONLY = new Set(['--cached', '--check', '--stat', '--numstat', '--summary']);
// Global options whose value may be the next word (https://git-scm.com/docs/git).
const GLOBAL_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--config-env', '--attr-source']);
const MAX_ALIAS_DEPTH = 10;
// Options that write even in the listing modes; git accepts any unambiguous prefix, so --ap is --apply.
const isApply = (option) => flags.longOption('--apply', '--ap'.length)(option);
const writesAncestor = (option) => flags.longOption('--build-fake-ancestor', '--bu'.length)(option.split('=')[0]);

// ctx: { cwd, env, globals, entries, sub } of one git call, so every query sees the repo and config
// that call sees.
const gitOut = ({ cwd, env, globals }, args) => {
  const result = spawnSync('git', [...globals, ...args], { cwd, env, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
};

// Repo-relative paths; a protected entry overlaps when either one contains the other.
const overlaps = (path, entries) =>
  entries.some((entry) => path === '' || path === entry || path.startsWith(`${entry}/`) || entry.startsWith(`${path}/`));

const protectedPaths = (ctx, paths) => {
  const top = gitOut(ctx, ['rev-parse', '--show-toplevel']);
  return top === null ? [] : paths.filter((p) => overlaps(relative(top, resolve(ctx.cwd, p)), ctx.entries));
};

const pathsReason = (ctx, paths) => {
  const hit = protectedPaths(ctx, paths);
  return hit.length > 0 ? `git ${ctx.sub} rewrites ${hit.join(', ')}` : null;
};

const splitArgs = (args) => {
  const dash = args.indexOf('--');
  // A bare - is the previous branch (https://git-scm.com/docs/git-switch).
  const positionals = shell.beforeDash(args).filter((a) => a === '-' || !a.startsWith('-'));
  return { positionals, paths: dash === -1 ? [] : args.slice(dash + 1) };
};

// Without --no-renames a protected file that the target renames away shows only under its new path.
const changedReason = (ctx, target, ref) => {
  const changed = (gitOut(ctx, ['diff', '--name-only', '--no-renames', 'HEAD', ref]) ?? '').split('\n');
  const hit = changed.filter((file) => file && overlaps(file, ctx.entries));
  return hit.length > 0 ? `git ${ctx.sub} ${target} changes ${hit.slice(0, 5).join(', ')}` : null;
};

// A ref target changes whatever differs from HEAD; a non-ref checkout target is a path, any other is
// an unknown ref that git rejects itself.
const targetReason = (ctx, target) => {
  const ref = target === '-' ? '@{-1}' : target;
  if (gitOut(ctx, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]) !== null) return changedReason(ctx, target, ref);
  return ctx.sub === 'checkout' ? pathsReason(ctx, [target]) : null;
};

const checkoutReason = (ctx, args) => {
  const { positionals, paths } = splitArgs(args);
  if (ctx.sub === 'restore') paths.push(...positionals);
  if (paths.length > 0) return pathsReason(ctx, paths);
  // A new branch starts at HEAD unless a start point follows its name.
  const target = args.some((a) => CREATE.has(a)) ? positionals[1] : positionals[0];
  return target ? targetReason(ctx, target) : null;
};

const always = ({ sub }) => `git ${sub} rewrites the worktree`;

// --staged alone writes only the index (https://git-scm.com/docs/git-restore).
const stagedOnly = (args) => {
  const options = shell.optionsOf(args, 's');
  const staged = options.includes('-S') || options.includes('--staged');
  const worktree = options.includes('-W') || options.includes('--worktree');
  return staged && !worktree;
};

// Calls that leave the worktree alone, so a path the hook cannot resolve does not matter. --apply turns
// patching back on after the listing modes (https://git-scm.com/docs/git-apply).
const READ_ONLY = new Map([
  ['apply', (args) => args.some((a) => APPLY_READ_ONLY.has(a)) && !args.some(isApply)],
  ['reset', (args) => !args.some((a) => HARD_RESET.has(a))],
  ['restore', stagedOnly],
]);

// --numstat lists only the new path of a rename, so any rename blocks. The listing runs outside the
// sandbox, so it never passes on an option that writes.
const applyReason = (ctx, args) => {
  const listed = args.filter((a) => !isApply(a) && !writesAncestor(a) && !APPLY_READ_ONLY.has(a));
  if (/^ rename /m.test(gitOut(ctx, ['apply', '--summary', ...listed]) ?? '')) return always(ctx);
  const numstat = gitOut(ctx, ['apply', '--numstat', ...listed]);
  if (numstat === null) return `git ${ctx.sub} reads a patch the hook cannot list`;
  return pathsReason(ctx, numstat.split('\n').filter(Boolean).map((line) => line.split('\t')[2]));
};

const REASONS = new Map([
  ['rebase', always],
  ['merge', always],
  ['cherry-pick', always],
  ['revert', always],
  ['pull', always],
  ['am', always],
  ['apply', applyReason],
  ['reset', always],
  // An orphan switch removes every tracked file; an orphan checkout keeps them.
  ['switch', (ctx, args) => (args.includes('--orphan') ? always(ctx) : checkoutReason(ctx, args))],
  ['checkout', checkoutReason],
  ['restore', checkoutReason],
]);

// Global options stay on every git query; -C moves the directory the call runs in.
const globalsOf = (ctx, words) => {
  const call = { ...ctx, globals: [...ctx.globals] };
  let i = 0;
  for (; words[i]?.startsWith('-'); i++) {
    const option = words[i];
    const value = GLOBAL_VALUE.has(option) ? [words[++i]] : [];
    if (option === '-C') call.cwd = resolve(call.cwd, value[0]);
    else call.globals.push(option, ...value);
  }
  return { call: { ...call, sub: words[i] }, args: words.slice(i + 1) };
};

const quote = (word) => `'${word.replaceAll("'", "'\\''")}'`;

// A ! alias is a shell command, run from the top-level directory.
const shellAliasReason = (call, line, depth) =>
  lineReason({ ...call, cwd: gitOut(call, ['rev-parse', '--show-toplevel']) ?? call.cwd }, line, depth + 1);

// Both alias config forms (git-config alias.*); git itself ignores an alias that hides a command.
const aliasReason = (call, args, depth) => {
  const alias =
    gitOut(call, ['config', '--get', `alias.${call.sub}`]) ?? gitOut(call, ['config', '--get', `alias.${call.sub}.command`]);
  if (!alias) return null;
  if (depth >= MAX_ALIAS_DEPTH) return { flag: false, reason: `git ${call.sub} nests aliases deeper than ${MAX_ALIAS_DEPTH}` };
  if (alias.startsWith('!')) return shellAliasReason(call, [alias.slice(1), ...args.map(quote)].join(' '), depth);
  return gitReason(call, [...shell.commands(alias).flat(), ...args], depth + 1);
};

// Shell expansion, globs and pathspec magic resolve after the hook runs, so it cannot rule them out.
const UNRESOLVED = /[$`*?[]|^:/;

const COMMON_DIR = ['rev-parse', '--path-format=absolute', '--git-common-dir'];
// The sandbox mounts denyWrite read-only relative to the project, so other repos have no protected paths.
const leavesProtected = (call, args) => READ_ONLY.get(call.sub)?.(args) || (project !== null && gitOut(call, COMMON_DIR) !== project);

const rewriteReason = (call, args) => {
  if (leavesProtected(call, args)) return null;
  const unresolved = args.filter((a) => UNRESOLVED.test(a));
  if (unresolved.length > 0) return { flag: false, reason: `git ${call.sub} names ${unresolved.join(', ')}, which the hook cannot resolve` };
  const reason = REASONS.get(call.sub)(call, args);
  return reason ? { flag: false, reason } : null;
};

/** @returns {{ flag: boolean, reason: string } | null} why the git call is blocked, or null */
// The subcommand and the global options, which the shell may expand into anything.
const expandedHead = (words, args) =>
  words
    .slice(0, words.length - args.length)
    .filter((word, i, head) => (word.startsWith('-') || i === head.length - 1) && flags.EXPANDS.test(word.split('=')[0]));

const gitReason = (ctx, words, depth) => {
  const { call, args } = globalsOf(ctx, words);
  const expanded = expandedHead(words, args);
  if (expanded.length > 0) return { flag: true, reason: `git ${expanded.join(' ')} expands after the hook reads it` };
  const flag = flags.FLAGS.has(call.sub) ? flags.flagReason(call, args) : null;
  if (flag) return { flag: true, reason: `git ${call.sub} ${flag}` };
  return REASONS.has(call.sub) ? rewriteReason(call, args) : aliasReason(call, args, depth);
};

const lineReason = (ctx, line, depth) => {
  const commands = shell.commands(line);
  const hookEnv = flags.setsHookEnv(ctx.hookEnv, commands);
  let cwd = ctx.cwd;
  for (const command of commands) {
    const { env, cwd: dir, words } = wrappers.unwrap({ env: ctx.env, cwd }, command);
    cwd = wrappers.cdTo({ env, cwd }, words);
    const reason = basename(words[0] ?? '') === 'git' ? gitReason({ ...ctx, env, cwd: dir, hookEnv }, words.slice(1), depth) : null;
    if (reason) return reason;
  }
  return null;
};

try {
  shell = await import('./shell-words.mjs');
  flags = await import('./git-flags.mjs');
  wrappers = await import('./wrappers.mjs');
  if (process.env.CLAUDE_PROJECT_DIR) project = gitOut({ cwd: process.env.CLAUDE_PROJECT_DIR, env: process.env, globals: [] }, COMMON_DIR);
  const settings = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'settings.json'), 'utf8'));
  // `gh issue *` matches `gh issue` with or without arguments, the same as a Bash(...) rule.
  const prefixes = (settings.sandbox?.excludedCommands ?? []).map((entry) => entry.replace(/\s\*$/, ''));
  const input = JSON.parse(readFileSync(0, 'utf8'));
  // Quoted text is data, not shell syntax: a jq filter or commit message may contain | or ;.
  // Double quotes still run $(...) and backticks, so substitutions are checked before they go.
  const noSingle = (input.tool_input?.command ?? '').replace(/'[^']*'/g, "''");
  const unquoted = noSingle.replace(/"[^"]*"/g, '""');
  const segments = unquoted.split(/&&|\|\||[;|\n]/).map((segment) => segment.trim());
  const excluded = prefixes.find((prefix) => segments.some((s) => s === prefix || s.startsWith(`${prefix} `)));
  const standalone = segments.length === 1 && !/[<>]/.test(unquoted) && !/`|\$\(/.test(noSingle);
  const entries = (settings.sandbox?.filesystem?.denyWrite ?? [])
    .filter((entry) => entry.startsWith('./'))
    .map((entry) => entry.slice(2));
  const cwd = input.cwd ?? process.cwd();
  const blocked = lineReason({ cwd, env: process.env, globals: [], entries, hookEnv: false },input.tool_input?.command ?? '', 0);
  if (blocked?.flag) {
    process.stderr.write(
      `Blocked by .claude/hooks/sandbox-gate.mjs:\n- ${blocked.reason}. Commit and push run their hooks, and a force push uses --force-with-lease, which asks the owner.\n`,
    );
    process.exit(2);
  }
  if (blocked) {
    process.stderr.write(
      `Blocked by .claude/hooks/sandbox-gate.mjs:\n- ${blocked.reason}, and the sandbox mounts those paths read-only, so it would half-apply. Save \`git diff > "$TMPDIR/wip.patch"\`, then ask the owner to run the command with \`! <command>\`.\n`,
    );
    process.exit(2);
  }
  if (excluded && !standalone) {
    process.stderr.write(
      `Blocked by .claude/hooks/sandbox-gate.mjs:\n- \`${excluded}\` is in sandbox.excludedCommands and runs unsandboxed only as a standalone call. Run it alone: no cd, ;, &&, |, redirect or substitution, and no dangerouslyDisableSandbox.\n`,
    );
    process.exit(2);
  }
} catch (error) {
  process.stderr.write(`sandbox-gate hook crashed, blocking the call: ${error}\n`);
  process.exit(2);
}
