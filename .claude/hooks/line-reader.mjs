// Every git call a Bash line runs, for sandbox-gate.mjs: in shell grammar and substitutions, in eval and
// shell -c strings, after any exec wrapper, and in quoted strings that start with git (trap, script -c).
// Imported inside the hook's try, so a broken module blocks instead of failing open. Interpreters and
// script files are not read: the command text does not show what they run (#95).
import { basename } from 'node:path';
import { EXPANDS, FLAGS, setsHookEnv } from './git-flags.mjs';
import { commands, substitutedName } from './shell-words.mjs';
import { cdTo, expand, unwrap } from './wrappers.mjs';

const MAX_DEPTH = 10;
const SHELLS = new Set(['sh', 'bash', 'dash', 'zsh', 'ksh', 'mksh', 'fish']);
// Shell options that take the next word: -o/+o and -O/+O, and bash's rc files (bash(1) 5.3.20, OPTIONS).
const SHELL_VALUE = /^([-+][oO]|--rcfile|--init-file)$/;

const block = (reason) => ({ flag: true, reason });
const nameOf = (word) => basename(word ?? '');
const inner = (ctx, data) => ({ ...ctx, data, depth: ctx.depth + 1 });

const shellOptions = (words) => {
  const options = [];
  let i = 1;
  for (; /^[-+]./.test(words[i] ?? '') && words[i] !== '--'; i++) {
    options.push(words[i]);
    if (SHELL_VALUE.test(words[i])) i++;
  }
  return { options, rest: words.slice(i + Number(words[i] === '--')) };
};

const hasShort = (options, letter) => options.some((option) => /^-[A-Za-z]+$/.test(option) && option.includes(letter));

// -c (fish also --command) reads commands from the first word after the options (bash(1), fish(1)).
const commandString = (options, rest) => {
  const long = options.find((option) => option.startsWith('--command='));
  if (long) return long.slice('--command='.length);
  return hasShort(options, 'c') || options.includes('--command') ? (rest[0] ?? '') : null;
};

// -s, or no word left, reads commands from stdin. Off the command position only -c counts, so
// `grep -c bash x` stays a grep.
const shellReason = (ctx, words, atStart) => {
  const { options, rest } = shellOptions(words);
  const string = commandString(options, rest);
  if (string !== null) return lineReason(inner(ctx, false), string);
  const stdin = rest.length === 0 || hasShort(options, 's');
  return atStart && stdin ? block(`${words[0]} reads commands from stdin, which the hook cannot see`) : null;
};

// eval runs its words after the shell expanded them, so built text stays unseen.
const evalReason = (ctx, words) => {
  const text = words.slice(1).join(' ');
  return EXPANDS.test(text) ? block('eval runs text the shell builds, which the hook cannot see') : lineReason(inner(ctx, false), text);
};

// source and . run a file; with no file word they read stdin or a process substitution.
const sourceReason = (_ctx, words) =>
  words.length < 2 || /^\/(dev|proc)\//.test(words[1]) ? block(`${words[0]} reads commands the hook cannot see`) : null;

const RUNS_TEXT = new Map([
  ['eval', evalReason],
  ['source', sourceReason],
  ['.', sourceReason],
]);

// After xargs a git call may get its subcommand or a flag from stdin.
const hidesFlags = (args) => args.some((word) => FLAGS.has(word)) || !args.some((word) => !word.startsWith('-'));
const gitCall = (ctx, args) =>
  ctx.appends && hidesFlags(args) ? block('xargs adds words to the git call that the hook cannot see') : ctx.check(ctx, args);

const startReason = (ctx, words) => {
  const runsText = RUNS_TEXT.get(words[0]);
  if (runsText) return runsText(ctx, words);
  if (SHELLS.has(nameOf(words[0]))) return shellReason(ctx, words, true);
  return nameOf(words[0]) === 'git' ? gitCall(ctx, words.slice(1)) : null;
};

// A git or shell word after any exec wrapper: sudo, watch, setsid, flock, find -exec, pnpm exec.
const laterReason = (ctx, words) => {
  for (let k = 1; k < words.length; k++) {
    const name = nameOf(words[k]);
    const reason = name === 'git' ? gitCall(ctx, words.slice(k + 1)) : SHELLS.has(name) && shellReason(ctx, words.slice(k), false);
    if (reason) return reason;
  }
  return null;
};

// A quoted string may be a command for trap, script -c, su -c or watch, and the value of an assignment
// or a -c key=value may be one git runs (core.fsmonitor, core.editor, GIT_CONFIG_VALUE_<n>). Only a
// string that starts with a command is read, so a commit message that mentions git later stays data.
const quotedReason = (ctx, words) => {
  for (const word of words) {
    const text = word.replace(/^[\w.:/-]+=/, '');
    const reason = /\s/.test(text) && lineReason(inner(ctx, true), text);
    if (reason) return reason;
  }
  return null;
};

// Commands that never run their arguments, and git's -m and --message values, hold data.
const PRINTS = new Set(['echo', 'printf', 'grep', 'egrep', 'fgrep', 'rg', 'gh', 'jq', 'test', '[']);
const MESSAGE_FLAG = /^(-[A-Za-z]*m|--message)$/;
const MESSAGE = /^(-[A-Za-z]*m.|--message=)/;

const commandWords = (words, command) => {
  if (PRINTS.has(nameOf(words[0]))) return [];
  if (nameOf(words[0]) !== 'git') return command;
  return command.filter((word, i) => !MESSAGE_FLAG.test(command[i - 1] ?? '') && !MESSAGE.test(word));
};

const callReason = (call, words, command) =>
  startReason(call, words) ?? (call.data ? null : laterReason(call, words)) ?? quotedReason(call, commandWords(words, command));

// for and select bind their variable to the listed words; a git among them counts (bash(1), SHELL GRAMMAR).
const loopValue = (values) => (values.some((value) => EXPANDS.test(value)) ? undefined : (values.find((value) => nameOf(value) === 'git') ?? values[0]));

const loopEnv = (env, words) => {
  const loops = (words[0] === 'for' || words[0] === 'select') && words[2] === 'in';
  const value = loops ? loopValue(words.slice(3)) : undefined;
  return value === undefined ? env : { ...env, [words[1]]: value };
};

// A command name the shell expands resolves from assignments and the environment, or blocks. A lone $
// starts a substitution, which substitutedName covers.
const literal = (state, name) => state.data || name === '$' || !EXPANDS.test(name);

const named = (state, words) => {
  const [name = '', ...rest] = words;
  // zsh expands =cmd to the path of cmd (zshexpn(1), Filename Expansion).
  if (literal(state, name)) return { words: [name.replace(/^=(?=.)/, ''), ...rest] };
  const resolved = expand(name, state.env);
  return resolved === null ? { words, reason: block(`${name} names a command the hook cannot resolve`) } : { words: [resolved, ...rest] };
};

// ( opens a subshell, so a cd inside it ends at the matching ).
const scoped = (state, word) => {
  if (word === '(') return { ...state, dirs: [...state.dirs, state.cwd] };
  return word === ')' ? { ...state, cwd: state.dirs.at(-1) ?? state.cwd, dirs: state.dirs.slice(0, -1) } : null;
};

const step = (state, command) => {
  const scope = scoped(state, command[0]);
  if (scope) return { state: scope };
  const { env, cwd, words, appends } = unwrap({ env: state.env, cwd: state.cwd }, command);
  const name = named({ ...state, env }, words);
  const reason = name.reason ?? callReason({ ...state, env, cwd, appends }, name.words, command);
  // An assignment alone sets a shell variable for the commands after it.
  const next = words.length === 0 ? { ...state, env } : { ...state, env: loopEnv(state.env, words), cwd: cdTo({ env, cwd: state.cwd }, name.words) };
  return { state: next, reason };
};

/** @returns {{ flag: boolean, reason: string } | null} why a git call in the line is blocked, or null. ctx: { cwd, env, globals, entries, hookEnv, depth, data, check }, where check(ctx, words) judges one git call */
const unreadable = (ctx, line) => {
  if (ctx.depth > MAX_DEPTH) return block(`the command nests deeper than ${MAX_DEPTH} levels`);
  return !ctx.data && substitutedName(line) ? block('a substitution names the command, which the hook cannot resolve') : null;
};

export const lineReason = (ctx, line) => {
  const early = unreadable(ctx, line);
  if (early) return early;
  const list = commands(line, ctx.data);
  let state = { ...ctx, hookEnv: setsHookEnv(ctx.hookEnv, list), dirs: [] };
  for (const command of list) {
    const result = step(state, command);
    if (result.reason) return result.reason;
    state = result.state;
  }
  return null;
};
