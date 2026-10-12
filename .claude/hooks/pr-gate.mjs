// PreToolUse hook (Bash): gates `gh pr create` and `gh issue create` with the rules pr-lint enforces in CI.
// It matches every Bash call because the hooks docs call the `if` filter best-effort.
// Exit 2 blocks the tool call and sends stderr to Claude. A crash, including a failed import, also exits 2,
// and settings.json sets onFailure: block for timeouts, so the gate never fails open.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Loaded inside the try below: a static import that fails would exit 1, which does not block.
/** @type {typeof import('../../.github/workflow-rules.mjs')} */
let rules;
/** @type {typeof import('../../.github/branch-links.mjs')} */
let links;
/** @type {typeof import('../../.github/graphql-pages.mjs')} */
let pages;

const projectDir = join(import.meta.dirname, '..', '..');

// Values of a flag in any form: --name value, --name=value, -n value, quoted or bare.
// The scan consumes other quoted strings whole, so flag text inside another flag's value never matches.
// gh keeps the last value of a repeated single-value flag, so checks read `.at(-1)`.
const flagValues = (segment, names) =>
  [...segment.matchAll(new RegExp(`(?:^|\\s)(${names.join('|')})(?:=|\\s+)(?:"([^"]*)"|'([^']*)'|(\\S+))|"[^"]*"|'[^']*'`, 'g'))]
    .filter((m) => m[1])
    .map((m) => m[2] ?? m[3] ?? m[4] ?? '');

const readBody = (segment, cwd) => {
  if (flagValues(segment, ['--body', '-b']).length > 0) return { error: 'Pass the body with --body-file <path>, not --body.' };
  const file = flagValues(segment, ['--body-file', '-F']).at(-1);
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

// null: GitHub answered that #N is no issue. undefined: no usable answer.
const parseIssue = (stdout) => {
  try {
    return JSON.parse(stdout).data?.repository?.issue ?? null;
  } catch {
    return undefined;
  }
};

// Same check as CI pr-lint: each "Closes #N" is an open Story or Task with a native parent.
// A failed lookup blocks, because the PR cannot be created offline anyway.
const checkLinkedIssues = (body, cwd) =>
  rules.closedIssueNumbers(body).flatMap((number) => {
    const result = spawnSync(
      'gh',
      ['api', 'graphql', '-f', `query=${rules.LINKED_ISSUE_QUERY}`, '-F', 'owner={owner}', '-F', 'repo={repo}', '-F', `number=${number}`],
      { cwd, encoding: 'utf8' },
    );
    if (result.error) return [`Cannot run gh to check #${number}: ${result.error.message}`];
    const issue = parseIssue(result.stdout);
    return issue === undefined ? [`Cannot check #${number}: ${result.stderr.trim()}`] : rules.findLinkedIssueViolations(number, issue);
  });

// The PR's head: --head, else the current branch (https://cli.github.com/manual/gh_pr_create).
// A fork head is <owner>:<branch>; a git ref name cannot contain a colon.
const headBranch = (segment, cwd) => {
  const head = flagValues(segment, ['--head', '-H']).at(-1);
  if (head) return head.split(':').at(-1);
  const result = spawnSync('git', ['branch', '--show-current'], { cwd, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
};

const parseIssues = (stdout) => {
  try {
    return JSON.parse(stdout).data?.repository?.issues;
  } catch {
    return undefined;
  }
};

// Same rule as CI pr-lint: the merge would close every issue linked to the head branch, so the body names each.
const checkBranchLinks = (segment, body, cwd) => {
  const branch = headBranch(segment, cwd);
  if (!branch) return ['Cannot read the head branch. Check out the Task branch or pass --head <branch>.'];
  const result = spawnSync(
    'gh',
    ['api', 'graphql', '-f', `query=${links.BRANCH_LINKS_QUERY}`, '-F', 'owner={owner}', '-F', 'repo={repo}'],
    { cwd, encoding: 'utf8' },
  );
  if (result.error) return [`Cannot run gh to check the issues linked to ${branch}: ${result.error.message}`];
  const issues = parseIssues(result.stdout);
  if (!issues) return [`Cannot check the issues linked to ${branch}: ${result.stderr.trim()}`];
  if (pages.truncatedConnections(issues).length > 0) return [`Cannot check the issues linked to ${branch}: more than one page.`];
  return links.findUnclosedLinkViolations(rules.closedIssueNumbers(body), links.issuesLinkedToBranch(issues.nodes, branch));
};

const checkPr = (segment, cwd) => {
  const { body, error } = readBody(segment, cwd);
  const bodyViolations = error ? [error] : rules.findPrBodyViolations(body);
  return [
    ...lintTitle(flagValues(segment, ['--title', '-t']).at(-1)),
    ...bodyViolations,
    ...(bodyViolations.length === 0 ? [...checkLinkedIssues(body, cwd), ...checkBranchLinks(segment, body, cwd)] : []),
  ];
};

const checkIssue = (segment, cwd) => {
  const { body, error } = readBody(segment, cwd);
  if (error) return [error];
  const labels = flagValues(segment, ['--label', '-l']).flatMap((value) => value.split(',').map((l) => l.trim()));
  const parent = flagValues(segment, ['--parent']).at(-1);
  return rules.findIssueViolations({ title: flagValues(segment, ['--title', '-t']).at(-1) ?? '', labels, body, parent });
};

// The repo is private on GitHub Free, without branch protection: the owner's review is the only server-side
// gate, so Claude never merges (#55). REST merges a pull request at pulls/<n>/merge or merge-async and a branch at
// repos/<o>/<r>/merges (https://docs.github.com/en/rest/pulls/pulls#merge-a-pull-request,
// https://docs.github.com/en/rest/branches/branches#merge-a-branch); GraphQL through these mutations.
const MERGE_API = /pulls\/[^/\s]+\/merge\b|\/merges\b|\b(?:mergePullRequest|enablePullRequestAutoMerge|mergeBranch)\b/;
const NO_MERGE = 'Claude never merges: the owner reviews and merges on GitHub (#55).';

// -F/--field key=@file and --input read the request from a file, or from stdin for `-` (gh api --help).
const apiFiles = (segment) => [
  ...flagValues(segment, ['-F', '--field']).filter((value) => value.includes('=@')).map((value) => value.split('=@')[1]),
  ...flagValues(segment, ['--input']),
];

// null: stdin or a file the hook cannot read, so it cannot rule out a merge.
const readRequest = (file, cwd) => {
  if (file === '-') return null;
  try {
    return readFileSync(resolve(cwd, file), 'utf8');
  } catch {
    return null;
  }
};

const checkApi = (segment, cwd) => {
  const texts = [segment, ...apiFiles(segment).map((file) => readRequest(file, cwd))];
  if (texts.includes(null)) return [`gh api reads its request from stdin or an unreadable file. ${NO_MERGE}`];
  return texts.some((text) => MERGE_API.test(text)) ? [`gh api calls a merge endpoint. ${NO_MERGE}`] : [];
};

// `gh` must start the segment (after env assignments or env/command/exec), so text that only
// mentions the command, such as a commit message, passes.
const PREFIX = String.raw`^\s*(?:(?:env|command|exec)\s+|\w+=\S*\s+)*gh\s+`;
const GATES = [
  // `new` is gh's built-in alias for `create` (gh pr new --help, gh issue new --help).
  [new RegExp(`${PREFIX}pr\\s+(?:create|new)\\b`), checkPr],
  [new RegExp(`${PREFIX}issue\\s+(?:create|new)\\b`), checkIssue],
  [new RegExp(`${PREFIX}pr\\s+merge\\b`), () => [NO_MERGE]],
  [new RegExp(`${PREFIX}api\\b`), checkApi],
  // An alias can rename any command, a blocked one included (https://cli.github.com/manual/gh_alias_set).
  [new RegExp(`${PREFIX}alias\\s+(?:set|import)\\b`), () => [`gh alias set and import can rename a blocked command. ${NO_MERGE}`]],
];

try {
  rules = await import('../../.github/workflow-rules.mjs');
  links = await import('../../.github/branch-links.mjs');
  pages = await import('../../.github/graphql-pages.mjs');
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
