import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect, assert } from 'vitest';

// Correction #123: after a merge the agent left git cleanup, issue updates and the handover to the owner.
// The after-merge skill does them; `claude plugin eval .claude/skills/after-merge` measures its behavior
// (https://code.claude.com/docs/en/plugin-evals). This spec pins the contract the evals rely on.
const SKILL_DIR = '.claude/skills/after-merge';
const EVALS_DIR = path.join(SKILL_DIR, 'evals');

const frontmatter = (file: string): Record<string, string> => {
  const block = fs.readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/);
  assert.exists(block, `${file} has no frontmatter`);
  return Object.fromEntries(
    block[1].split('\n').flatMap((line) => {
      const match = line.match(/^([\w-]+):\s*(.*)$/);
      return match ? [[match[1], match[2]]] : [];
    }),
  );
};

const SKILL_GRADER = /^'"skill"\\s\*:\\s\*"\(\?:\[\\w-\]\+:\)\?after-merge"'$/;

const skillGraders = () =>
  fs
    .readdirSync(EVALS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(EVALS_DIR, entry.name, 'prompt.md')))
    .flatMap((entry) => {
      const graders = path.join(EVALS_DIR, entry.name, 'graders');
      return fs
        .readdirSync(graders)
        .map((file) => frontmatter(path.join(graders, file)))
        .filter((grader) => grader.tool === 'Skill' && SKILL_GRADER.test(grader.input_match));
    });

describe('after-merge skill', () => {
  it('is invocable by Claude and by /after-merge with merge triggers in the description', () => {
    const meta = frontmatter(path.join(SKILL_DIR, 'SKILL.md'));
    expect(meta.name).toBe('after-merge');
    expect(meta['disable-model-invocation']).toBeUndefined();
    expect(meta['user-invocable']).toBeUndefined();
    assert.exists(meta.description);
    expect(meta.description.length).toBeLessThanOrEqual(1024);
    expect(meta.description).toMatch(/merged/);
    expect(meta.description).toMatch(/Not for performing a merge/);
  });

  // #179: since #177 a release is a tag and a GitHub Release, with no commit to pull after the merge.
  it('reports the release tag instead of waiting for a release commit', () => {
    const skill = fs.readFileSync(path.join(SKILL_DIR, 'SKILL.md'), 'utf8');
    expect(skill).not.toMatch(/chore\(release\)/);
    expect(skill).toMatch(/gh release view/);
  });

  it('is a skills-directory plugin that claude plugin eval can target', () => {
    const manifest: { name: string } = JSON.parse(fs.readFileSync(path.join(SKILL_DIR, '.claude-plugin/plugin.json'), 'utf8'));
    expect(manifest.name).toBe('after-merge');
  });

  it('has at least 3 should-trigger and 2 should-not-trigger eval cases', () => {
    const graders = skillGraders();
    expect(graders.filter((grader) => grader.max === undefined).length).toBeGreaterThanOrEqual(3);
    expect(graders.filter((grader) => grader.max === '0' && grader.arm === 'both').length).toBeGreaterThanOrEqual(2);
  });

  it('never deletes unmerged work in the scaffolded case', () => {
    const grader = frontmatter(path.join(EVALS_DIR, 'reconcile-squash-merged/graders/unmerged-branch-kept.md'));
    expect(grader).toMatchObject({ tool: 'Bash', max: '0', arm: 'both' });
  });

  it('keeps eval results out of git', () => {
    expect(fs.readFileSync('.gitignore', 'utf8')).toContain('.claude/skills/*/evals/results/');
  });
});
