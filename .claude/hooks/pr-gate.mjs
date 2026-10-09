// PreToolUse hook (Bash): gates `gh pr create` and `gh issue create` with the rules pr-lint enforces in CI.
// It matches every Bash call because the hooks docs call the `if` filter best-effort.
// Exit 2 blocks the tool call and sends stderr to Claude. A crash also blocks, so the gate never fails open.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { findIssueViolations, findPrBodyViolations } from '../../.github/workflow-rules.mjs';

const projectDir = join(import.meta.dirname, '..', '..');

// Values of a flag in any form: --name value, --name=value, -n value, quoted or bare.
const flagValues = (segment, names) =>
  [...segment.matchAll(new RegExp(`(?:^|\\s)(?:${names.join('|')})(?:=|\\s+)(?:"([^"]*)"|'([^']*)'|(\\S+))`, 'g'))].map(
    (m) => m[1] ?? m[2] ?? m[3] ?? '',
  );

const readBody = (segment, cwd) => {
  if (flagValues(segment, ['--body', '-b']).length > 0) return { error: 'Pass the body with --body-file <path>, not --body.' };
  const [file] = flagValues(segment, ['--body-file', '-F']);
  if (!file) return { error: 'Pass the body with --body-file <path>.' };
  try {
    return { body: readFileSync(resolve(cwd, file), 'utf8') };
  } catch {
    return { error: `Cannot read the body file ${file}.` };
  }
};

// The PR title becomes the squash commit on master, so it must pass commitlint.
const lintTitle = (title) => {
  if (!title) return ['Pass the PR title with --title. It becomes the squash commit.'];
  const commitlint = join(projectDir, 'node_modules', '.bin', 'commitlint');
  const result = spawnSync(commitlint, { input: title, cwd: projectDir, encoding: 'utf8' });
  return result.status === 0 ? [] : [`The title is not a Conventional Commit:\n${result.stdout}${result.stderr}`];
};

const checkPr = (segment, cwd) => {
  const { body, error } = readBody(segment, cwd);
  return [...lintTitle(flagValues(segment, ['--title', '-t'])[0]), ...(error ? [error] : findPrBodyViolations(body))];
};

const checkIssue = (segment, cwd) => {
  const { body, error } = readBody(segment, cwd);
  if (error) return [error];
  const labels = flagValues(segment, ['--label', '-l']).flatMap((value) => value.split(',').map((l) => l.trim()));
  return findIssueViolations({ title: flagValues(segment, ['--title', '-t'])[0] ?? '', labels, body });
};

// `gh` must start the segment (after env assignments or env/command/exec), so text that only
// mentions the command, such as a commit message, passes.
const PREFIX = String.raw`^\s*(?:(?:env|command|exec)\s+|\w+=\S*\s+)*gh\s+`;
const GATES = [
  [new RegExp(`${PREFIX}pr\\s+create\\b`), checkPr],
  [new RegExp(`${PREFIX}issue\\s+create\\b`), checkIssue],
];

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const command = input.tool_input?.command ?? '';
  const cwd = input.cwd ?? process.cwd();
  const violations = command
    .split(/&&|\|\||[;|\n]/)
    .flatMap((segment) => GATES.filter(([pattern]) => pattern.test(segment)).flatMap(([, check]) => check(segment, cwd)));
  if (violations.length > 0) {
    process.stderr.write(`Blocked by .claude/hooks/pr-gate.mjs:\n- ${violations.join('\n- ')}\n`);
    process.exit(2);
  }
} catch (error) {
  process.stderr.write(`pr-gate hook crashed, blocking the call: ${error}\n`);
  process.exit(2);
}
