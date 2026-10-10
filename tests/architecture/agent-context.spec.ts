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

  // "off" also hides the skill from the / menu, so only "user-invocable-only" keeps it typable
  // (https://code.claude.com/docs/en/skills).
  it.each(hiddenSkills)('hides the %s skill from Claude but keeps it typable', (skill) => {
    expect(settings.skillOverrides?.[skill]).toBe('user-invocable-only');
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

// Lessons from agent mistakes become gates, not notes. The sandbox mounts gate configs such as
// eslint.config.mjs read-only, so a stash cannot restore them and half-applies; commit by path.
// `cmd *` also matches the bare command (https://code.claude.com/docs/en/sandboxing).
describe('Learned agent guards', () => {
  const settings: { autoMemoryEnabled?: boolean; permissions?: { deny?: string[] } } = JSON.parse(
    read('.claude/settings.json'),
  );

  it('denies git stash', () => {
    expect(settings.permissions?.deny).toContain('Bash(git stash *)');
  });

  // Knowledge lives in git history and GitHub issues, never in machine-local notes
  // (https://code.claude.com/docs/en/memory).
  it('turns auto memory off', () => {
    expect(settings.autoMemoryEnabled).toBe(false);
  });

  // Owner rule 2026-10-10. No hook can prove a browser check happened, so the line itself is pinned.
  it('keeps the live-check base rule in CLAUDE.md', () => {
    expect(read('CLAUDE.md')).toMatch(/^3\. Live check before every "done":.*Passing tests alone are not done\.$/m);
  });

  it('registers the sandbox gate hook', () => {
    expect(read('.claude/settings.json')).toContain('.claude/hooks/sandbox-gate.mjs');
  });

  // A timed-out or crashed hook does not block unless onFailure is "block" (https://code.claude.com/docs/en/hooks).
  it('makes every PreToolUse gate fail closed', () => {
    const hooks: { hooks?: { PreToolUse?: Array<{ hooks: Array<{ command: string; onFailure?: string }> }> } } =
      JSON.parse(read('.claude/settings.json'));
    const gates = (hooks.hooks?.PreToolUse ?? []).flatMap((group) => group.hooks);
    expect(gates.length).toBeGreaterThan(0);
    expect(gates.filter((gate) => gate.onFailure !== 'block').map((gate) => gate.command)).toEqual([]);
  });

});

describe('Deny rules match a flag in any position', () => {
  const settings: { permissions?: { deny?: string[] } } = JSON.parse(read('.claude/settings.json'));

  // Bash rules match the whole command, `*` stands for any text, and a trailing ` *` also matches the
  // bare command (https://code.claude.com/docs/en/permissions#wildcard-patterns).
  const matches = (rule: string, command: string): boolean => {
    const pattern = rule.slice('Bash('.length, -1);
    const escaped = pattern.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
    const regex = pattern.endsWith(' *') && pattern.indexOf('*') === pattern.length - 1
      ? `^${escaped.slice(0, -3)}( .*)?$`
      : `^${escaped}$`;
    return new RegExp(regex, 's').test(command);
  };
  const denied = (command: string): boolean =>
    (settings.permissions?.deny ?? []).some((rule) => rule.startsWith('Bash(') && matches(rule, command));

  it.each([
    'git commit --no-verify -m x',
    'git commit -m "fix: x" --no-verify',
    'git commit -m x --no-verify -- src/a.ts',
    'git commit -n -m x',
    'git commit -m x -n',
    'git push --no-verify',
    'git push origin b --no-verify',
    'git push --force origin b',
    'git push origin b --force',
    'git push -f origin b',
    'git push origin b -f',
  ])('denies %s', (command) => {
    expect(denied(command)).toBe(true);
  });

  it.each(['git commit -m "fix: x" -- src/a.ts', 'git push origin b', 'git push --force-with-lease origin b'])(
    'does not deny %s',
    (command) => {
      expect(denied(command)).toBe(false);
    },
  );
});

// README is read as truth too: its tree names only what the repo tracks (plans and specs live in issues).
describe('README tree', () => {
  const line = (dir: string): string => read('README.md').split('\n').find((l) => l.startsWith(dir)) ?? '';

  it('describes docs/ as the architecture map and ADRs only', () => {
    expect(line('docs/')).toMatch(/ARCHITECTURE\.md/);
    expect(line('docs/')).not.toMatch(/spec|plan/i);
  });

  it('describes .claude/ without skills', () => {
    expect(line('.claude/')).toMatch(/rules, hooks/);
    expect(line('.claude/')).not.toMatch(/skill/i);
  });
});
