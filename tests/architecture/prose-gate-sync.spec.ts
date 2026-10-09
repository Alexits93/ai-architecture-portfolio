import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ESLint } from 'eslint';
import { describe, it, expect } from 'vitest';

// The banned list lives in CLAUDE.md (the rule), eslint.config.mjs (code gate) and
// .claude/hooks/anti-slop.mjs (Markdown gate). The gates must agree with the rule and each other.

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

const claudeList = (): string[] =>
  (read('CLAUDE.md').match(/^- Banned words: (.+)\.$/m)?.[1] ?? '').split(', ');

const arrayLiteral = (file: string): string[] =>
  [...(read(file).match(/const BANNED_WORDS = \[([^\]]+)\]/)?.[1] ?? '').matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);

const eslintFlags = async (text: string): Promise<boolean> => {
  const [result] = await new ESLint().lintText(`export const a = ${JSON.stringify(text)};\n`, { filePath: 'src/shared/lib/x.ts' });
  return result.messages.some((m) => m.ruleId === 'no-restricted-syntax');
};

const hookFlags = (text: string): boolean =>
  spawnSync('node', [path.join(process.cwd(), '.claude/hooks/anti-slop.mjs')], {
    input: JSON.stringify({ tool_input: { file_path: 'docs/x.md', content: text } }),
  }).status === 2;

describe('AI-prose gate sync', () => {
  it('has the same banned list in CLAUDE.md, ESLint and the anti-slop hook', () => {
    expect(claudeList().length).toBeGreaterThan(10);
    expect(arrayLiteral('eslint.config.mjs')).toEqual(claudeList());
    expect(arrayLiteral('.claude/hooks/anti-slop.mjs')).toEqual(claudeList());
  });

  // em-dash, rocket, heavy heart, left-right arrow, copyright, registered, trademark
  const symbols = [0x2014, 0x1f680, 0x2764, 0x2194, 0xa9, 0xae, 0x2122].map((cp) => `a ${String.fromCodePoint(cp)} b`);
  const samples = [...claudeList().map((word) => `a ${word} b`), ...symbols, 'plain text, robustness'];

  it.each(samples)('ESLint and the hook agree on "%s"', async (sample) => {
    expect(await eslintFlags(sample)).toBe(hookFlags(sample));
  });
});
