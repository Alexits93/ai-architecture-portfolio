// Commands that run their arguments as a command, for sandbox-gate.mjs. Imported inside the hook's try,
// so a broken module blocks instead of failing open. The set is the one Claude Code strips before it
// matches rules (https://code.claude.com/docs/en/permissions, Wrappers), plus env, exec and flagged xargs.
// eval, sh -c and bash -c are not read (#94).
import { resolve } from 'node:path';
import { commands } from './shell-words.mjs';

const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;

// valued: short options that take a value; optional: short options whose value only sticks; long: long
// options that take a value, with their short name; operands: words before the command. From timeout(1),
// nice(1), stdbuf(1), env(1) in GNU coreutils 9.12, xargs(1) in GNU findutils 4.11.0, and help exec,
// help time and help builtin in bash 5.3.20.
const NONE = { valued: '', optional: '', long: {}, operands: 0 };
const WRAPPERS = new Map([
  ['env', { ...NONE, valued: 'auCS', long: { '--argv0': '-a', '--unset': '-u', '--chdir': '-C', '--split-string': '-S', '--env0-from': '-' } }],
  ['command', NONE],
  ['builtin', NONE],
  ['noglob', NONE],
  ['nohup', NONE],
  ['time', NONE],
  ['exec', { ...NONE, valued: 'a' }],
  ['nice', { ...NONE, valued: 'n', long: { '--adjustment': '-n' } }],
  ['timeout', { ...NONE, valued: 'ks', long: { '--kill-after': '-k', '--signal': '-s' }, operands: 1 }],
  ['stdbuf', { ...NONE, valued: 'ioe', long: { '--input': '-i', '--output': '-o', '--error': '-e' } }],
  [
    'xargs',
    {
      ...NONE,
      valued: 'adEILnPs',
      optional: 'eil',
      long: {
        '--arg-file': '-a',
        '--delimiter': '-d',
        '--max-lines': '-L',
        '--max-args': '-n',
        '--max-procs': '-P',
        '--max-chars': '-s',
        '--process-slot-var': '-',
      },
    },
  ],
]);

// getopt_long accepts any unambiguous prefix of a long option.
const longOf = ({ long }, word) => {
  const [given, ...stuck] = word.split('=');
  const name = Object.keys(long).find((key) => key.startsWith(given));
  return { name: name ? long[name] : given, valued: Boolean(name) && stuck.length === 0, stuck: stuck.join('=') };
};

// A value letter ends a short cluster: the rest of the cluster is its value, or the next word if empty.
const shortOf = ({ valued, optional }, word) => {
  const letters = [...word.slice(1)];
  const at = letters.findIndex((letter) => valued.includes(letter) || optional.includes(letter));
  if (at === -1) return { name: word, valued: false, stuck: '' };
  const stuck = letters.slice(at + 1).join('');
  return { name: `-${letters[at]}`, valued: stuck === '' && valued.includes(letters[at]), stuck };
};

const optionOf = (wrapper, word) => (word.startsWith('--') ? longOf(wrapper, word) : shortOf(wrapper, word));

/** @returns {{ options: Map<string, string>, words: string[] }} the wrapper's options and the command after them */
const parse = (wrapper, words) => {
  const options = new Map();
  let i = 0;
  for (; words[i]?.startsWith('-') && words[i] !== '--'; i++) {
    const option = optionOf(wrapper, words[i]);
    options.set(option.name, option.valued ? words[++i] : option.stuck);
  }
  return { options, words: words.slice(i + Number(words[i] === '--') + wrapper.operands) };
};

/** @returns {string | null} the absolute directory a cd or env -C names, or null when the shell would expand more than ~, $NAME and ${NAME} */
export const dirOf = (word, { env, cwd }) => {
  const expanded = word
    .replace(/^~(?=\/|$)/, () => env.HOME ?? '~')
    .replace(/\$(?:\{(\w+)\}|(\w+))/g, (match, braced, bare) => env[braced ?? bare] ?? match);
  return /[$`~*?[]/.test(expanded) ? null : resolve(cwd, expanded);
};

const cdTarget = (words) => words.slice(1).find((word) => !/^-[LPe@]+$/.test(word)) ?? '~';

/** @returns {string} the directory later commands run in: cd moves it, unless the target is - or one the hook cannot resolve */
export const cdTo = (ctx, words) => {
  const target = words[0] === 'cd' ? cdTarget(words) : '-';
  return target === '-' ? ctx.cwd : (dirOf(target, ctx) ?? ctx.cwd);
};

// env -S splits its value into the command words; env -C moves the directory the command runs in.
const unwrapEnv = (ctx, { options, words }) => {
  const split = options.has('-S') ? commands(options.get('-S')).flat() : [];
  const dir = options.has('-C') ? dirOf(options.get('-C'), ctx) : null;
  return { ...ctx, cwd: dir ?? ctx.cwd, words: [...split, ...words] };
};

const assign = (ctx, word) => {
  const eq = word.indexOf('=');
  return { ...ctx, env: { ...ctx.env, [word.slice(0, eq)]: word.slice(eq + 1) } };
};

// command -v and -V only look the command up, so nothing runs.
const runs = (word, next) => WRAPPERS.has(word) && !(word === 'command' && /^-[vV]$/.test(next ?? ''));

/** @returns {{ env: Record<string, string>, cwd: string, words: string[] }} the command after leading assignments and wrappers */
export const unwrap = (ctx, words) => {
  const [word = '', ...rest] = words;
  if (ASSIGNMENT.test(word)) return unwrap(assign(ctx, word), rest);
  if (!runs(word, rest[0])) return { ...ctx, words };
  const parsed = parse(WRAPPERS.get(word), rest);
  const next = word === 'env' ? unwrapEnv(ctx, parsed) : { ...ctx, words: parsed.words };
  return unwrap({ env: next.env, cwd: next.cwd }, next.words);
};
