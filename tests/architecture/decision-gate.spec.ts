import { spawnSync } from 'child_process';
import * as path from 'path';
import { describe, it, expect } from 'vitest';

interface Option {
  label: string;
  description: string;
}

const decisionGate = (options: Option[], multiSelect = false): { status: number | null; stderr: string } =>
  spawnSync('node', [path.join(process.cwd(), '.claude/hooks/decision-gate.mjs')], {
    input: JSON.stringify({ tool_input: { questions: [{ question: 'Which store?', header: 'Store', options, multiSelect }] } }),
    encoding: 'utf8',
  });

const RECOMMENDED = { label: 'localStorage (Recommended)', description: 'Native, no dependency.' };
const ALTERNATIVE = { label: 'nanostores', description: 'Adds a dependency for shared state.' };
const NO_OP = { label: 'No-op: keep cookies', description: 'Nothing changes; the cookie banner stays.' };

// Owner rule 2026-10-11 (#155): every decision prompt carries a recommendation, an alternative and a no-op.
describe('decision-gate hook', () => {
  it.each([[false], [true]])('allows a recommendation, an alternative and a no-op (multiSelect %s)', (multiSelect) => {
    expect(decisionGate([RECOMMENDED, ALTERNATIVE, NO_OP], multiSelect).status).toBe(0);
  });

  it.each([
    ['no recommendation first', [ALTERNATIVE, RECOMMENDED, NO_OP]],
    ['no recommendation', [ALTERNATIVE, { ...ALTERNATIVE, label: 'zustand' }, NO_OP]],
    ['two recommendations', [RECOMMENDED, { ...ALTERNATIVE, label: 'nanostores (Recommended)' }, NO_OP]],
    ['no no-op', [RECOMMENDED, ALTERNATIVE, { ...ALTERNATIVE, label: 'zustand' }]],
    ['two no-ops', [RECOMMENDED, NO_OP, { ...NO_OP, label: 'No-op: later' }]],
    ['no alternative', [RECOMMENDED, NO_OP]],
    ['an empty description', [RECOMMENDED, { ...ALTERNATIVE, description: ' ' }, NO_OP]],
  ])('blocks a question with %s', (_label, options) => {
    const result = decisionGate(options);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Which store?');
  });
});
