// PR, issue and plan rules shared by .github/workflows/pr-lint.yml (CI), .claude/hooks/pr-gate.mjs and
// .claude/hooks/session-plan.mjs (local). tests/config/workflow-rules.spec.ts keeps the constants in sync
// with the GitHub templates. The plan is the open issue tree: no plan files live in the repo.

export const PR_SECTIONS = [
  'Summary & Motivation',
  'Linked Tickets/Issues',
  'Testing Strategy',
  'Pre-Merge Checklist',
  'Unverified Risks & Metacognition',
  'Screenshots/Gifs',
];

export const PR_CHECKLIST = [
  'Tests passed',
  'FSD / Architectural boundaries respected',
  'No `any` / `unknown` introduced',
  'Modernization mandated (used latest HTML5/CSS3/TS)',
  'Documentation updated (Task issue, Architecture, ADRs)',
];

// Epic > Story > Task: Stories and Tasks hang below their parent as native GitHub sub-issues.
const NEEDS_PARENT = ['story', 'task'];

export const ISSUE_TEMPLATES = {
  epic: { prefix: '[Epic] ', label: 'epic', headings: ['High-Level Goal', 'Success Metrics'] },
  story: { prefix: '[Story] ', label: 'story', headings: ['User Story', 'Acceptance Criteria'] },
  task: { prefix: '[Task] ', label: 'task', headings: ['Description', 'Requirements / Constraints'] },
  bug: {
    prefix: '[Bug] ',
    label: 'bug',
    headings: ['Bug Description', 'Steps to Reproduce', 'Expected Behavior', 'Environment Details'],
  },
};

/** @param {string} body @param {string} marker */
const sectionsOf = (body, marker) =>
  new Map(
    body
      .split(new RegExp(`^${marker} `, 'm'))
      .slice(1)
      .map((part) => {
        const [heading = '', ...rest] = part.split('\n');
        return [heading.trim(), rest.join('\n').trim()];
      }),
  );

// Every keyword GitHub closes an issue on, with an optional colon:
// https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue
const CLOSING = String.raw`\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?):?\s+`;

/** @type {Array<(body: string, sections: Map<string, string>) => string[]>} */
const PR_RULES = [
  (_body, sections) => PR_SECTIONS.filter((s) => !sections.get(s)).map((s) => `Section "${s}" is missing or empty.`),
  (body) => (body.includes('<!--') ? ['Remove every HTML comment from the template.'] : []),
  (_body, sections) =>
    PR_CHECKLIST.filter((item) => !(sections.get('Pre-Merge Checklist') ?? '').includes(`- [x] ${item}`)).map(
      (item) => `Tick the checklist item "${item}".`,
    ),
  (_body, sections) =>
    /^- \S/m.test(sections.get('Unverified Risks & Metacognition') ?? '')
      ? []
      : ['List at least one real blind spot under "Unverified Risks & Metacognition".'],
  (body) =>
    /\b(Closes|Fixes|Resolves) #\d+/i.test(body)
      ? []
      : ['Link the Story or Task issue with "Closes #N" (never the PR number).'],
  (body) =>
    new RegExp(`${CLOSING}[\\w.-]+/[\\w.-]+#\\d+`, 'i').test(body)
      ? ['Close only issues of this repo, with "Closes #N" and no owner/repo prefix.']
      : [],
];

/** @param {string} body @returns {string[]} */
export const findPrBodyViolations = (body) => {
  if (body.trim() === '') return ['The PR body is empty. Fill out .github/PULL_REQUEST_TEMPLATE.md.'];
  const sections = sectionsOf(body, '##');
  return PR_RULES.flatMap((rule) => rule(body, sections));
};

/** @param {{ title: string, labels: string[], body: string, parent?: string }} issue @returns {string[]} */
export const findIssueViolations = ({ title, labels, body, parent }) => {
  const rule = Object.values(ISSUE_TEMPLATES).find((t) => title.startsWith(t.prefix));
  if (!rule) {
    const prefixes = Object.values(ISSUE_TEMPLATES).map((t) => t.prefix.trim());
    return [`Start the title with one of ${prefixes.join(', ')}.`];
  }
  const sections = sectionsOf(body, '###');
  const violations = rule.headings
    .filter((h) => !sections.get(h))
    .map((h) => `Section "### ${h}" from .github/ISSUE_TEMPLATE is missing or empty.`);
  if (!labels.includes(rule.label)) violations.push(`Add the label "${rule.label}".`);
  if (NEEDS_PARENT.includes(rule.label) && !parent) {
    violations.push('Set the parent issue with --parent <N>, so GitHub links it as a native sub-issue.');
  }
  return violations;
};

// Local references only: owner/repo#N is an issue of another repo and is rejected by PR_RULES.
/** @param {string} body @returns {number[]} */
export const closedIssueNumbers = (body) =>
  [...body.matchAll(new RegExp(`${CLOSING}#(\\d+)`, 'gi'))].map((m) => Number(m[1]));

export const LINKED_ISSUE_QUERY = `query($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    issue(number: $number) { state labels(first: 20) { nodes { name } } parent { number } }
  }
}`;

/**
 * A PR closes an open Story or Task that has a native parent. `issue` is null when #N is no issue.
 * @param {number} number
 * @param {{ state: string, labels: { nodes: Array<{ name: string }> }, parent: { number: number } | null } | null} issue
 * @returns {string[]}
 */
export const findLinkedIssueViolations = (number, issue) => {
  if (!issue) return [`#${number} is not an issue in this repository (a PR number?).`];
  const labels = issue.labels.nodes.map((l) => l.name);
  return [
    ...(issue.state === 'OPEN' ? [] : [`#${number} is closed. Link the open Story or Task this PR ships.`]),
    ...(labels.some((l) => NEEDS_PARENT.includes(l)) ? [] : [`#${number} is not labeled story or task.`]),
    ...(issue.parent ? [] : [`#${number} has no native parent. Run: gh issue edit ${number} --parent <N>`]),
  ];
};

// A handover is a Task comment whose first line is this marker. Session start loads only the newest one.
export const HANDOVER_MARKER = '<!-- handover -->';

export const HANDOVER_QUERY = `query($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) { issue(number: $number) { comments(last: 50) { nodes { body } } } }
}`;

/**
 * The open issue linked to `branch` (created with `gh issue develop`).
 * @param {PlanIssue[]} issues @param {string} branch @returns {PlanIssue | undefined}
 */
export const linkedTask = (issues, branch) =>
  issues.find((i) => i.linkedBranches.nodes.some((b) => b.ref?.name === branch));

/** @param {Array<{ body: string }>} comments oldest first @returns {string | null} */
export const latestHandover = (comments) =>
  comments.findLast((c) => c.body.startsWith(HANDOVER_MARKER))?.body ?? null;

/** @param {string} branch @param {PlanIssue | undefined} task @param {string | null} handover @returns {string} */
export const formatCurrentTask = (branch, task, handover) => {
  if (!task) {
    return `No open Task is linked to branch ${branch}. Create Task branches with \`gh issue develop <N> --checkout\`.`;
  }
  const head = `Current Task: #${task.number} ${task.title} (branch ${branch})`;
  return handover === null ? `${head}\nNo handover yet.` : `${head}\nHandover:\n${handover}`;
};

// Fallback for a branch no Task is linked to: the open PR with this head branch and the issues it closes.
export const PR_HANDOVER_QUERY = `query($owner: String!, $repo: String!, $branch: String!) {
  repository(owner: $owner, name: $repo) {
    pullRequests(headRefName: $branch, states: OPEN, first: 1) {
      nodes {
        number
        closingIssuesReferences(first: 50) { nodes { number title comments(last: 50) { nodes { createdAt body } } } }
      }
    }
  }
}`;

/**
 * @typedef {{ number: number, closingIssuesReferences: { nodes: Array<{ number: number, title: string,
 *   comments: { nodes: Array<{ createdAt: string, body: string }> } }> } }} OpenPr
 */

/**
 * The newest handover by createdAt among the issues the branch's open PR closes.
 * @param {string} branch @param {OpenPr | undefined} pr @returns {string}
 */
export const formatPrHandover = (branch, pr) => {
  if (!pr) return formatCurrentTask(branch, undefined, null);
  const issues = pr.closingIssuesReferences.nodes;
  const [newest] = issues
    .flatMap((issue) => issue.comments.nodes.filter((c) => c.body.startsWith(HANDOVER_MARKER)).map((c) => ({ issue, ...c })))
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  const head = `Branch ${branch} is not linked to a Task. Open PR #${pr.number} closes ${issues.map((i) => `#${i.number}`).join(', ')}.`;
  return newest
    ? `${head}\nCurrent Task: #${newest.issue.number} ${newest.issue.title} (newest handover in PR #${pr.number})\nHandover:\n${newest.body}`
    : `${head}\nNo handover yet.`;
};

export const OPEN_PLAN_QUERY = `query($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    issues(states: OPEN, first: 100, orderBy: { field: CREATED_AT, direction: ASC }) {
      pageInfo { hasNextPage }
      nodes {
        number title parent { number } blockedBy(first: 10) { nodes { number state } }
        linkedBranches(first: 10) { nodes { ref { name } } }
      }
    }
  }
}`;

/**
 * @typedef {{ number: number, title: string, parent: { number: number } | null,
 *   blockedBy: { nodes: Array<{ number: number, state: string }> },
 *   linkedBranches: { nodes: Array<{ ref: { name: string } | null }> } }} PlanIssue
 */

/**
 * Renders the open issues as an indented Epic > Story > Task tree with open blockers.
 * @param {PlanIssue[]} issues
 * @returns {string}
 */
export const formatPlan = (issues) => {
  const open = new Set(issues.map((i) => i.number));
  const children = (parent) => issues.filter((i) => (i.parent && open.has(i.parent.number) ? i.parent.number : null) === parent);
  const line = (issue, depth) => {
    const blockers = issue.blockedBy.nodes.filter((b) => b.state === 'OPEN').map((b) => `#${b.number}`);
    const blocked = blockers.length > 0 ? ` (blocked by ${blockers.join(', ')})` : '';
    return [`${'  '.repeat(depth)}- #${issue.number} ${issue.title}${blocked}`, ...children(issue.number).flatMap((c) => line(c, depth + 1))];
  };
  return issues.length === 0 ? 'No open issues.' : children(null).flatMap((root) => line(root, 0)).join('\n');
};
