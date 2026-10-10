import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// A hook whose shared module fails to load must still block (pr-gate) or print the stop notice
// (session-plan); an import error outside the try exits 1, which Claude Code treats as non-blocking.
describe('hooks with a broken workflow-rules.mjs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'broken-rules-'));
  beforeAll(() => {
    fs.mkdirSync(path.join(root, '.claude/hooks'), { recursive: true });
    fs.mkdirSync(path.join(root, '.github'));
    fs.writeFileSync(path.join(root, '.github/workflow-rules.mjs'), 'export const broken = ;\n');
    for (const hook of ['pr-gate.mjs', 'session-plan.mjs']) {
      fs.copyFileSync(path.join(process.cwd(), '.claude/hooks', hook), path.join(root, '.claude/hooks', hook));
    }
  });
  afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

  const runCopy = (hook: string, input: string) =>
    spawnSync(process.execPath, [path.join(root, '.claude/hooks', hook)], { input, encoding: 'utf8' });

  it('pr-gate blocks', () => {
    const result = runCopy('pr-gate.mjs', JSON.stringify({ tool_input: { command: 'gh pr create --title "chore: x"' } }));
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('pr-gate hook crashed, blocking the call');
  });

  it('session-plan prints PLAN UNAVAILABLE', () => {
    expect(runCopy('session-plan.mjs', '').stdout).toContain('PLAN UNAVAILABLE');
  });
});

describe('sandbox-gate with a broken shell-words.mjs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'broken-words-'));
  beforeAll(() => {
    fs.mkdirSync(path.join(root, '.claude/hooks'), { recursive: true });
    fs.copyFileSync(path.join(process.cwd(), '.claude/settings.json'), path.join(root, '.claude/settings.json'));
    fs.copyFileSync(path.join(process.cwd(), '.claude/hooks/sandbox-gate.mjs'), path.join(root, '.claude/hooks/sandbox-gate.mjs'));
    fs.writeFileSync(path.join(root, '.claude/hooks/shell-words.mjs'), 'export const broken = ;\n');
  });
  afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

  it('blocks', () => {
    const result = spawnSync(process.execPath, [path.join(root, '.claude/hooks/sandbox-gate.mjs')], {
      input: JSON.stringify({ tool_input: { command: 'git status' } }),
      encoding: 'utf8',
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('sandbox-gate hook crashed, blocking the call');
  });
});
