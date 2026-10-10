import { describe, it, expect } from 'vitest';
import { PR_CHECKLIST, PR_SECTIONS, RISK_TABLE_HEADER, findPrBodyViolations } from '../../.github/workflow-rules.mjs';

const content: Record<string, string> = {
  'Linked Tickets/Issues': 'Closes #44',
  'Pre-Merge Checklist': PR_CHECKLIST.map((item) => `- [x] ${item}`).join('\n'),
};

const bodyWith = (...rows: string[]): string =>
  PR_SECTIONS.map((section) =>
    section === 'Unverified Risks & Metacognition'
      ? `## ${section}\n${[RISK_TABLE_HEADER, '|---|---|---|---|', ...rows].join('\n')}`
      : `## ${section}\n${content[section] ?? 'Filled.'}`,
  ).join('\n');

const lowRow = '| Shell parsing of quoted flags | Low | Unit tests cover the common forms | #84 |';

describe('PR risk table', () => {
  it('accepts Low rows', () => {
    expect(findPrBodyViolations(bodyWith(lowRow, '| Safari focus ring | Low | Checked in WebKit | accepted |'))).toEqual([]);
  });

  it.each(['Medium', 'High'])('rejects a %s risk: close or reduce the gap before the PR', (rating) => {
    expect(findPrBodyViolations(bodyWith(lowRow.replace('Low', rating)))).toEqual([
      `Risk "Shell parsing of quoted flags" is ${rating}. Close the gap or reduce it to Low before the PR.`,
    ]);
  });

  it.each([
    ['no rows', bodyWith()],
    ['an empty cell', bodyWith(lowRow.replace('Low', ' '))],
    ['an unknown rating', bodyWith(lowRow.replace('Low', 'Minor'))],
    ['a missing cell', bodyWith(lowRow.replace(' #84 |', ''))],
  ])('rejects %s', (_label, body) => {
    expect(findPrBodyViolations(body).length).toBeGreaterThan(0);
  });
});
