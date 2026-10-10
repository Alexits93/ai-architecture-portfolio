// PreToolUse hook (Bash): sandbox.excludedCommands run unsandboxed only as a standalone call.
// A cd, chain, pipe, redirect or substitution keeps the whole call sandboxed
// (https://code.claude.com/docs/en/sandboxing), so it fails and invites an unsandboxed retry that
// widens far more than the one command. This hook blocks those calls instead.
// Exit 2 blocks the tool call and sends stderr to Claude. A crash also blocks, so the gate never fails open.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// The sandbox mounts sandbox.filesystem.denyWrite read-only, so a sandboxed git command that rewrites
// one of those paths half-applies. The hook cannot tell whether a call is sandboxed (the Bash tool_input
// has no such field, https://code.claude.com/docs/en/hooks), so it blocks whenever a protected path would
// change; the owner then runs the command with `! git ...`.
const HARD_RESET = new Set(['--hard', '--merge', '--keep']);
const CREATE = new Set(['-c', '-C', '-b', '-B', '--create', '--force-create', '--orphan']);

const gitOut = (cwd, args) => {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
};

// Repo-relative paths; a protected entry overlaps when either one contains the other.
const overlaps = (path, entries) =>
  entries.some((entry) => path === '' || path === entry || path.startsWith(`${entry}/`) || entry.startsWith(`${path}/`));

// ctx: { sub, cwd, entries } of one git call.
const protectedPaths = ({ cwd, entries }, paths) => {
  const top = gitOut(cwd, ['rev-parse', '--show-toplevel']);
  return top === null ? [] : paths.filter((p) => overlaps(relative(top, resolve(cwd, p)), entries));
};

const pathsReason = (ctx, paths) => {
  const hit = protectedPaths(ctx, paths);
  return hit.length > 0 ? `git ${ctx.sub} rewrites ${hit.join(', ')}` : null;
};

const splitArgs = (args) => {
  const dash = args.indexOf('--');
  const options = dash === -1 ? args : args.slice(0, dash);
  return { positionals: options.filter((a) => !a.startsWith('-')), paths: dash === -1 ? [] : args.slice(dash + 1) };
};

const changedReason = ({ sub, cwd, entries }, target, ref) => {
  const changed = (gitOut(cwd, ['diff', '--name-only', 'HEAD', ref]) ?? '').split('\n');
  const hit = changed.filter((file) => file && overlaps(file, entries));
  return hit.length > 0 ? `git ${sub} ${target} changes ${hit.slice(0, 5).join(', ')}` : null;
};

// A ref target changes whatever differs from HEAD; a non-ref checkout target is a path, any other is
// an unknown ref that git rejects itself.
const targetReason = (ctx, target) => {
  const ref = target === '-' ? '@{-1}' : target;
  if (gitOut(ctx.cwd, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]) !== null) return changedReason(ctx, target, ref);
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
const REASONS = new Map([
  ['rebase', always],
  ['merge', always],
  ['cherry-pick', always],
  ['reset', (ctx, args) => (args.some((a) => HARD_RESET.has(a)) ? always(ctx) : null)],
  ['switch', checkoutReason],
  ['checkout', checkoutReason],
  ['restore', checkoutReason],
]);

/** @returns {string | null} why the git command would rewrite protected paths, or null */
const rewritesProtected = (segment, cwd, entries) => {
  const [program, sub, ...args] = segment.split(/\s+/).filter(Boolean);
  const reason = program === 'git' ? REASONS.get(sub) : undefined;
  return reason ? reason({ sub, cwd, entries }, args) : null;
};

try {
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
  const rewrite = segments.map((segment) => rewritesProtected(segment, cwd, entries)).find(Boolean);
  if (rewrite) {
    process.stderr.write(
      `Blocked by .claude/hooks/sandbox-gate.mjs:\n- ${rewrite}, and the sandbox mounts those paths read-only, so it would half-apply. Save \`git diff > "$TMPDIR/wip.patch"\`, then ask the owner to run the command with \`! <command>\`.\n`,
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
