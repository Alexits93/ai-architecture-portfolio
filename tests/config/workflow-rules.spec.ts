import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';
import {
  ISSUE_TEMPLATES,
  PR_CHECKLIST,
  PR_SECTIONS,
  closedIssueNumbers,
  findIssueViolations,
  findLinkedIssueViolations,
  findPrBodyViolations,
  formatPlan,
} from '../../.github/workflow-rules.mjs';

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

const validPrBody = [
  '## Summary & Motivation',
  'Gate PR creation.',
  '## Linked Tickets/Issues',
  'Closes #44',
  '## Testing Strategy',
  'Unit tests for the rules.',
  '## Pre-Merge Checklist',
  ...PR_CHECKLIST.map((item) => `- [x] ${item}`),
  '## Unverified Risks & Metacognition',
  '- Shell parsing of quoted flags.',
  '## Screenshots/Gifs',
  'None: no UI change.',
].join('\n');

describe('PR body rules', () => {
  it('accept a fully filled template', () => {
    expect(findPrBodyViolations(validPrBody)).toEqual([]);
  });

  it.each([
    ['an empty body', ''],
    ['a template comment', `${validPrBody}\n<!-- fill me -->`],
    ['an unticked box', validPrBody.replace('- [x] Tests passed', '- [ ] Tests passed')],
    ['a missing checklist item', validPrBody.replace('- [x] Tests passed\n', '')],
    ['an empty risk bullet', validPrBody.replace('- Shell parsing of quoted flags.', '- ')],
    ['an empty section', validPrBody.replace('Unit tests for the rules.', '')],
    ['a missing section', validPrBody.replace('## Screenshots/Gifs\nNone: no UI change.', '')],
    ['no closing keyword', validPrBody.replace('Closes #44', 'See #44')],
  ])('reject %s', (_label, body) => {
    expect(findPrBodyViolations(body).length).toBeGreaterThan(0);
  });
});

const validTask = {
  title: '[Task] Gate PR creation',
  labels: ['task'],
  body: '### Description\n\nGate it.\n\n### Requirements / Constraints\n\nTests.\n',
  parent: '35',
};

describe('issue rules', () => {
  it('accept an issue that follows its template', () => {
    expect(findIssueViolations(validTask)).toEqual([]);
  });

  it.each([
    ['an unknown title prefix', { ...validTask, title: 'Gate PR creation' }],
    ['a missing label', { ...validTask, labels: [] }],
    ['an empty required section', { ...validTask, body: validTask.body.replace('Gate it.', '') }],
    ['no native parent', { ...validTask, parent: undefined }],
  ])('reject %s', (_label, issue) => {
    expect(findIssueViolations(issue).length).toBeGreaterThan(0);
  });

  it('do not require a parent for an Epic', () => {
    const epic = { title: '[Epic] X', labels: ['epic'], body: '### High-Level Goal\n\nA\n\n### Success Metrics\n\nB\n' };
    expect(findIssueViolations(epic)).toEqual([]);
  });
});

describe('linked issue rules', () => {
  const openTask = { state: 'OPEN', labels: { nodes: [{ name: 'task' }] }, parent: { number: 35 } };

  it('read every closing keyword', () => {
    expect(closedIssueNumbers('Closes #1, fixes #2 and Resolves #3. See #4.')).toEqual([1, 2, 3]);
  });

  it('accept an open Task with a native parent', () => {
    expect(findLinkedIssueViolations(46, openTask)).toEqual([]);
  });

  it.each([
    ['no issue (a PR number)', null],
    ['a closed issue', { ...openTask, state: 'CLOSED' }],
    ['an Epic', { ...openTask, labels: { nodes: [{ name: 'epic' }] } }],
    ['no native parent', { ...openTask, parent: null }],
  ])('reject %s', (_label, issue) => {
    expect(findLinkedIssueViolations(46, issue).length).toBeGreaterThan(0);
  });
});

describe('plan rendering', () => {
  const issue = (number: number, parent: number | null, blockers: Array<[number, string]> = []) => ({
    number,
    title: `I${number}`,
    parent: parent === null ? null : { number: parent },
    blockedBy: { nodes: blockers.map(([n, state]) => ({ number: n, state })) },
  });

  it('nests children and shows only open blockers', () => {
    const plan = formatPlan([issue(1, null), issue(2, 1, [[3, 'OPEN'], [9, 'CLOSED']]), issue(3, 1)]);
    expect(plan).toBe('- #1 I1\n  - #2 I2 (blocked by #3)\n  - #3 I3');
  });

  it('shows an issue whose parent is closed at the top level', () => {
    expect(formatPlan([issue(5, 99)])).toBe('- #5 I5');
  });

  it('says so when nothing is open', () => {
    expect(formatPlan([])).toBe('No open issues.');
  });
});

describe('rules match the GitHub templates', () => {
  it('PR sections and checklist items come from PULL_REQUEST_TEMPLATE.md', () => {
    const template = read('.github/PULL_REQUEST_TEMPLATE.md');
    expect([...template.matchAll(/^## (.+)$/gm)].map((m) => m[1])).toEqual(PR_SECTIONS);
    expect([...template.matchAll(/^- \[ \] (.+)$/gm)].map((m) => m[1])).toEqual(PR_CHECKLIST);
  });

  it.each(Object.entries(ISSUE_TEMPLATES))('%s.yml has the same prefix, label and required fields', (name, rule) => {
    const template = read(`.github/ISSUE_TEMPLATE/${name}.yml`);
    const required = template
      .split(/^ {2}- type: /m)
      .filter((field) => /required: true/.test(field))
      .map((field) => /label: (.+)/.exec(field)?.[1]);
    expect(template).toContain(`title: "${rule.prefix}"`);
    expect(template).toContain(`labels: ["${rule.label}"]`);
    expect(required).toEqual(rule.headings);
  });
});
