import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';
import {
  ISSUE_TEMPLATES,
  PR_CHECKLIST,
  PR_SECTIONS,
  findIssueViolations,
  findPrBodyViolations,
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
  body: '### Description\n\nGate it.\n\n### Requirements / Constraints\n\nTests.\n\n### Parent Story/Epic\n\n#35\n',
};

describe('issue rules', () => {
  it('accept an issue that follows its template', () => {
    expect(findIssueViolations(validTask)).toEqual([]);
  });

  it.each([
    ['an unknown title prefix', { ...validTask, title: 'Gate PR creation' }],
    ['a missing label', { ...validTask, labels: [] }],
    ['an empty required section', { ...validTask, body: validTask.body.replace('Gate it.', '') }],
    ['no parent issue', { ...validTask, body: validTask.body.replace('#35', 'none') }],
  ])('reject %s', (_label, issue) => {
    expect(findIssueViolations(issue).length).toBeGreaterThan(0);
  });

  it('do not require a parent for an Epic', () => {
    const epic = { title: '[Epic] X', labels: ['epic'], body: '### High-Level Goal\n\nA\n\n### Success Metrics\n\nB\n' };
    expect(findIssueViolations(epic)).toEqual([]);
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
