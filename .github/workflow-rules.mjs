// PR and issue rules shared by .github/workflows/pr-lint.yml (CI) and .claude/hooks/pr-gate.mjs (local).
// tests/config/workflow-rules.spec.ts keeps the constants in sync with the GitHub templates.

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
  'Documentation updated (DevSpecs, Specs, Architecture)',
];

// Epic > Story > Task: every issue below an Epic names its parent.
export const ISSUE_TEMPLATES = {
  epic: { prefix: '[Epic] ', label: 'epic', headings: ['High-Level Goal', 'Success Metrics'] },
  story: { prefix: '[Story] ', label: 'story', headings: ['User Story', 'Acceptance Criteria', 'Parent Epic'] },
  task: { prefix: '[Task] ', label: 'task', headings: ['Description', 'Requirements / Constraints', 'Parent Story/Epic'] },
  bug: {
    prefix: '[Bug] ',
    label: 'bug',
    headings: ['Bug Description', 'Steps to Reproduce', 'Expected Behavior', 'Environment Details'],
  },
};

const PARENT_HEADINGS = ['Parent Epic', 'Parent Story/Epic'];

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
];

/** @param {string} body @returns {string[]} */
export const findPrBodyViolations = (body) => {
  if (body.trim() === '') return ['The PR body is empty. Fill out .github/PULL_REQUEST_TEMPLATE.md.'];
  const sections = sectionsOf(body, '##');
  return PR_RULES.flatMap((rule) => rule(body, sections));
};

/** @param {{ title: string, labels: string[], body: string }} issue @returns {string[]} */
export const findIssueViolations = ({ title, labels, body }) => {
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
  rule.headings
    .filter((h) => PARENT_HEADINGS.includes(h) && sections.get(h) && !/#\d+/.test(sections.get(h) ?? ''))
    .forEach((h) => violations.push(`"${h}" must reference the parent issue as #N.`));
  return violations;
};
