// Shell words and git-style options of a Bash tool command, for hooks that check what a command runs.
// Imported inside the hook's try, so a broken module blocks instead of failing open. Subshells and
// grouping are #84.

// '...' | "..." (backslash escapes $ ` " \ newline) | \x | command separator | blank | redirect with its
// target, which ends a word and is dropped | plain text.
const TOKEN =
  /'([^']*)'?|"((?:[^"\\]|\\[\s\S])*)"?|\\([\s\S])|([;&|\n])|([^\S\n]+|\d*[<>][<>&|]?[^\S\n]*(?:'[^']*'|"(?:[^"\\]|\\[\s\S])*"|[^\s'"\\;&|<>])*)|([^\s'"\\;&|<>]+)/g;
const SEP = Symbol('separator');
const BLANK = Symbol('blank');
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const WRAPPERS = new Set(['env', 'command']);

const partOf = (m) => m[1] ?? m[2]?.replace(/\\([$`"\\\n])/g, '$1') ?? m[3] ?? m[6];

const splitOn = (items, marker) =>
  items.reduce((groups, item) => {
    if (item === marker) groups.push([]);
    else groups.at(-1).push(item);
    return groups;
  }, [[]]);

// Bash removes a backslash-newline before it splits words (bash(1) 5.3, QUOTING).
/** @returns {string[][]} the words of each simple command, quotes removed, split at && || ; | & and newlines */
export const commands = (line) =>
  splitOn([...line.replaceAll('\\\n', '').matchAll(TOKEN)].map((m) => partOf(m) ?? (m[4] ? SEP : BLANK)), SEP)
    .map((pieces) => splitOn(pieces, BLANK).filter((parts) => parts.length > 0).map((parts) => parts.join('')))
    .filter((words) => words.length > 0);

// env -u takes a value; command -v and -V only look the command up, so nothing runs.
const skipOptions = (wrapper, words) => {
  if (wrapper === 'command' && /^-[vV]$/.test(words[0] ?? '')) return [];
  const start = words.findIndex((word, i) => !word.startsWith('-') && words[i - 1] !== '-u');
  return start === -1 ? [] : words.slice(start);
};

/** @returns {{ env: Record<string, string>, words: string[] }} the command after leading assignments and the env and command wrappers */
export const unwrap = (env, words) => {
  const [word = '', ...rest] = words;
  if (ASSIGNMENT.test(word)) {
    const eq = word.indexOf('=');
    return unwrap({ ...env, [word.slice(0, eq)]: word.slice(eq + 1) }, rest);
  }
  return WRAPPERS.has(word) ? unwrap(env, skipOptions(word, rest)) : { env, words };
};

export const beforeDash = (args) => {
  const dash = args.indexOf('--');
  return dash === -1 ? args : args.slice(0, dash);
};

// A value letter ends a short cluster and takes the next word when it is last; an optional-value
// letter takes only the rest of its cluster (https://git-scm.com/docs/gitcli).
const clusterOf = (arg, valued, optional) => {
  const letters = [...arg.slice(1)];
  const stop = letters.findIndex((letter) => valued.includes(letter) || optional.includes(letter));
  const taken = stop === -1 ? letters : letters.slice(0, stop + 1);
  return { names: taken.map((letter) => `-${letter}`), needsValue: stop === letters.length - 1 && valued.includes(letters[stop]) };
};

/** @returns {string[]} the words before --, without the values that value options take */
export const freeWords = (args, valued, optional = '') => {
  const words = beforeDash(args);
  const free = [];
  for (let i = 0; i < words.length; i++) {
    free.push(words[i]);
    if (/^-[^-]/.test(words[i])) i += Number(clusterOf(words[i], valued, optional).needsValue);
  }
  return free;
};

/** @returns {string[]} option names before --, with short clusters split into letters */
export const optionsOf = (args, valued, optional = '') =>
  freeWords(args, valued, optional)
    .filter((word) => word.startsWith('-'))
    .flatMap((word) => (word.startsWith('--') ? [word.split('=')[0]] : clusterOf(word, valued, optional).names));
