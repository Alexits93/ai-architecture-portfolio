import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';

// Agent instruction files decay silently: they grow, and they keep pointing at files that moved.
// These checks fail CI instead, so the context Claude loads stays short and true.

const root = process.cwd();
const CLAUDE_MD_MAX_LINES = 100;
const RULE_MAX_LINES = 60;

const ruleFiles = fs.readdirSync(path.join(root, '.claude/rules')).map((f) => `.claude/rules/${f}`);
const skillFiles = fs
  .readdirSync(path.join(root, '.claude/skills'))
  .map((dir) => `.claude/skills/${dir}/SKILL.md`);
const agentDocs = ['CLAUDE.md', ...ruleFiles, ...skillFiles];

const read = (file: string): string => fs.readFileSync(path.join(root, file), 'utf8');
const lineCount = (file: string): number => read(file).split('\n').length;

// A backticked token counts as a repo path when it contains a slash and no placeholders or globs.
// Single-segment prefixes such as `feat/` are branch names, not paths.
const isRepoPath = (token: string): boolean =>
  token.includes('/') && !/^[/@~]|https?:|[*<>${}\s]|^[^/]+\/$/.test(token);

const referencedPaths = (file: string): string[] =>
  [...read(file).matchAll(/`([^`]+)`/g)].map((m) => m[1]).filter(isRepoPath);

const ruleGlobs = (file: string): string[] => {
  const frontmatter = read(file).match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  return [...frontmatter.matchAll(/^\s+- "([^"]+)"/gm)].map((m) => m[1]);
};

const matchesAnyFile = (glob: string): boolean =>
  fs.globSync(glob, { cwd: root, exclude: (p) => p.includes('node_modules') }).length > 0;

describe('Agent context budget', () => {
  it(`keeps CLAUDE.md under ${CLAUDE_MD_MAX_LINES} lines`, () => {
    expect(lineCount('CLAUDE.md')).toBeLessThanOrEqual(CLAUDE_MD_MAX_LINES);
  });

  it.each(ruleFiles)(`keeps %s under ${RULE_MAX_LINES} lines`, (file) => {
    expect(lineCount(file)).toBeLessThanOrEqual(RULE_MAX_LINES);
  });
});

describe('Agent context truthfulness', () => {
  it.each(agentDocs)('%s references only existing paths', (file) => {
    const missing = referencedPaths(file).filter((p) => !fs.existsSync(path.join(root, p)));
    expect(missing).toEqual([]);
  });

  it.each(ruleFiles)('%s is path-scoped and every glob matches a file', (file) => {
    const globs = ruleGlobs(file);
    expect(globs.length).toBeGreaterThan(0);
    expect(globs.filter((g) => !matchesAnyFile(g))).toEqual([]);
  });

  it('registers only hook scripts that exist', () => {
    const settings = read('.claude/settings.json');
    const scripts = [...settings.matchAll(/\.claude\/hooks\/[\w-]+\.mjs/g)].map((m) => m[0]);
    expect(scripts.length).toBeGreaterThan(0);
    expect(scripts.filter((s) => !fs.existsSync(path.join(root, s)))).toEqual([]);
  });
});
