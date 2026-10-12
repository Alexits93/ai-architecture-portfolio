import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect, assert } from 'vitest';
import {
  ISSUE_TEMPLATES,
  PR_CHECKLIST,
  PR_SECTIONS,
  RISK_TABLE_HEADER,
  closedIssueNumbers,
  findIssueViolations,
  findLinkedIssueViolations,
  findPrBodyViolations,
} from '../../.github/workflow-rules.mjs';
import { findUnclosedLinkViolations, issuesLinkedToBranch } from '../../.github/branch-links.mjs';

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
  RISK_TABLE_HEADER,
  '|---|---|---|---|',
  '| Shell parsing of quoted flags | Low | Unit tests cover the common forms | #84 |',
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
    ['a risk bullet instead of the table', validPrBody.replace(/^\|.*\n/gm, '').replace('## Screenshots', '- Shell parsing.\n## Screenshots')],
    ['an empty section', validPrBody.replace('Unit tests for the rules.', '')],
    ['a missing section', validPrBody.replace('## Screenshots/Gifs\nNone: no UI change.', '')],
    ['no closing keyword', validPrBody.replace('Closes #44', 'See #44')],
    ['a cross-repo closing reference', validPrBody.replace('Closes #44', 'Closes #44, fixes o/r#9')],
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
  const openTask = { state: 'OPEN', labels: { pageInfo: { hasNextPage: false }, nodes: [{ name: 'task' }] }, parent: { number: 35 } };

  // https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue
  it('read every closing keyword GitHub honors', () => {
    const body = 'Closes #1, fixes #2, Resolves #3, close #4, CLOSED: #5, fix #6, fixed #7, resolve #8, resolved #9. See #10.';
    expect(closedIssueNumbers(body)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  // pr-gate looks up each number once, however often the body names it.
  it('read a repeated reference once', () => {
    expect(closedIssueNumbers('Closes #1. Fixes #2. Closes #1.')).toEqual([1, 2]);
  });

  // o/r#9 is issue 9 of another repo, so it must never resolve to this repo's #9.
  it('never resolve a cross-repo reference to a local issue', () => {
    expect(closedIssueNumbers('Closes #1, fixes o/r#9, resolves: owner/repo#10')).toEqual([1]);
  });

  it('accept an open Task with a native parent', () => {
    expect(findLinkedIssueViolations(46, openTask)).toEqual([]);
  });

  it.each([
    ['no issue (a PR number)', null],
    ['a closed issue', { ...openTask, state: 'CLOSED' }],
    ['an Epic', { ...openTask, labels: { pageInfo: { hasNextPage: false }, nodes: [{ name: 'epic' }] } }],
    ['no native parent', { ...openTask, parent: null }],
    // A label past the page could be the only story or task label, so the check cannot pass.
    ['more labels than one page holds', { ...openTask, labels: { pageInfo: { hasNextPage: true }, nodes: [{ name: 'task' }] } }],
  ])('reject %s', (_label, issue) => {
    expect(findLinkedIssueViolations(46, issue).length).toBeGreaterThan(0);
  });
});

// GitHub closes on merge every issue linked to the PR, including the issue its branch was created for
// (#185: PR #182 said "Closes #181" from a branch linked to #72 and closed both).
describe('branch link rules', () => {
  const linked = (number: number, branches: string[]) => ({
    number,
    linkedBranches: { nodes: branches.map((name) => ({ ref: { name } })) },
  });
  const issues = [linked(72, ['ci/x']), linked(181, ['ci/y']), linked(44, []), { number: 9, linkedBranches: { nodes: [{ ref: null }] } }];

  it('find the open issues linked to a branch', () => {
    expect(issuesLinkedToBranch(issues, 'ci/x')).toEqual([72]);
    expect(issuesLinkedToBranch(issues, 'ci/z')).toEqual([]);
  });

  it('reject a linked issue the body does not close, and name it', () => {
    const violations = findUnclosedLinkViolations([181], [72]);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain('#72');
  });

  it.each([
    ['a linked issue the body closes', [181], [181]],
    ['no linked issue', [44], []],
  ])('accept %s', (_label, closed, linkedNumbers) => {
    expect(findUnclosedLinkViolations(closed, linkedNumbers)).toEqual([]);
  });
});

describe('rules match the GitHub templates', () => {
  it('PR sections and checklist items come from PULL_REQUEST_TEMPLATE.md', () => {
    const template = read('.github/PULL_REQUEST_TEMPLATE.md');
    expect([...template.matchAll(/^## (.+)$/gm)].map((m) => m[1])).toEqual(PR_SECTIONS);
    expect([...template.matchAll(/^- \[ \] (.+)$/gm)].map((m) => m[1])).toEqual(PR_CHECKLIST);
    expect(template).toContain(`${RISK_TABLE_HEADER}\n|---|---|---|---|\n`);
  });

  it.each(Object.entries(ISSUE_TEMPLATES))('%s.yml has the same prefix, label and required fields', (name, rule) => {
    const template = read(`.github/ISSUE_TEMPLATE/${name}.yml`);
    const required = template
      .split(/^ {2}- type: /m)
      .filter((field) => /required: true/.test(field))
      .map((field) => {
        const label = /label: (.+)/.exec(field);
        assert.exists(label, field);
        return label[1];
      });
    expect(template).toContain(`title: "${rule.prefix}"`);
    expect(template).toContain(`labels: ["${rule.label}"]`);
    expect(required).toEqual(rule.headings);
  });
});
