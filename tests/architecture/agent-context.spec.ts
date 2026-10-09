import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';

// Agent instruction files decay silently: they grow, and they keep pointing at files that moved.
// These checks fail CI instead, so the context Claude loads stays short and true.

const root = process.cwd();
const CLAUDE_MD_MAX_LINES = 100;
const RULE_MAX_LINES = 60;

const ruleFiles = fs.readdirSync(path.join(root, '.claude/rules')).map((f) => `.claude/rules/${f}`);
const skillsDir = path.join(root, '.claude/skills');
const skillFiles = fs.existsSync(skillsDir)
  ? fs.readdirSync(skillsDir).map((dir) => `.claude/skills/${dir}/SKILL.md`)
  : [];
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

// Every listed skill and tool costs context on every turn. These are never used in this repo,
// so they stay out of Claude's listing; hidden skills remain typable in the / menu.
describe('Agent context exclusions', () => {
  const settings: { enableArtifact?: boolean; skillOverrides?: Record<string, string> } =
    JSON.parse(read('.claude/settings.json'));
  const hiddenSkills = [
    'docx',
    'pptx',
    'xlsx',
    'pdf',
    'docs',
    'morning',
    'google-workspace',
    'computer-use',
    'built-in-browser',
    'chrome-browser',
    'import-memory',
    'skill-creator',
    'deep-research',
    'dataviz',
    'claude-api',
    'claude-in-chrome',
    'plugin-authoring',
    'keybindings-help',
    'schedule',
    'loop',
  ];

  it('turns the Artifact tool off', () => {
    expect(settings.enableArtifact).toBe(false);
  });

  it.each(hiddenSkills)('hides the %s skill from Claude', (skill) => {
    expect(['user-invocable-only', 'off']).toContain(settings.skillOverrides?.[skill]);
  });
});

// Hooks receive no context-usage field and compaction loses detail, so the 150k handover rule
// relies on the status line: it gets the token count and shows a marker from 130k on.
describe('Session handover status line', () => {
  const settings: { statusLine?: { type?: string; command?: string } } = JSON.parse(
    read('.claude/settings.json'),
  );
  const render = (inputTokens: number): string =>
    execFileSync('sh', ['-c', settings.statusLine?.command ?? 'false'], {
      input: JSON.stringify({ context_window: { total_input_tokens: inputTokens } }),
      encoding: 'utf8',
    });

  it('runs as a command status line', () => {
    expect(settings.statusLine?.type).toBe('command');
  });

  it('shows the token count without the marker below 130k', () => {
    const line = render(129999);
    expect(line).toContain('129k / 150k');
    expect(line).not.toContain('HANDOVER');
  });

  it('shows the handover marker from 130k on', () => {
    expect(render(130000)).toContain('HANDOVER NOW');
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
