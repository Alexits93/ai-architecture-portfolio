// PreToolUse hook (Write|Edit): blocks banned words, em-dashes and emojis in Markdown.
// Exit 2 blocks the tool call and sends stderr to Claude as feedback.
import { readFileSync } from 'node:fs';

const BANNED_WORDS = [
  'delve', 'robust', 'seamless', 'synergy', 'tapestry', 'cutting-edge', 'leverage',
  'furthermore', 'moreover', 'ultimately', 'in conclusion', 'unlocking',
];
// Files that must spell out the banned list.
const EXEMPT = ['CLAUDE.md'];

const findViolation = (text) => {
  const lower = text.toLowerCase();
  const word = BANNED_WORDS.find((w) => new RegExp(`\\b${w}\\b`).test(lower));
  if (word) return `banned word "${word}"`;
  if (text.includes('—')) return 'em-dash (use a comma, colon or new sentence)';
  if (/\p{Extended_Pictographic}/u.test(text.replace(/[©®™]/g, ''))) return 'emoji';
  return null;
};

const isChecked = (filePath) =>
  filePath.endsWith('.md') && !EXEMPT.some((name) => filePath.endsWith(`/${name}`) || filePath === name);

const input = JSON.parse(readFileSync(0, 'utf8'));
const { file_path: filePath = '', content, new_string: newString } = input.tool_input ?? {};
const violation = isChecked(filePath) ? findViolation(content ?? newString ?? '') : null;

if (violation) {
  process.stderr.write(`Blocked: ${violation} in ${filePath}. Rewrite the text and retry.\n`);
  process.exit(2);
}
