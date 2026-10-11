// PreToolUse hook (AskUserQuestion): every owner decision offers a recommendation, a valid alternative and a
// no-op, each explained (owner rule 2026-10-11, #155). Exit 2 blocks the call and sends stderr to Claude.
import { readFileSync } from 'node:fs';

const RECOMMENDED = '(Recommended)';
const NO_OP = 'No-op';

const isRecommended = (o) => o.label.trim().endsWith(RECOMMENDED);

// [holds, what the question must fix when it does not]
const RULES = [
  [(options) => options.filter(isRecommended).length === 1 && isRecommended(options[0]),
    `the recommendation must be the first option and the only label ending in "${RECOMMENDED}"`],
  [(options) => options.filter((o) => o.label.trim().startsWith(NO_OP)).length === 1,
    `exactly one label must start with "${NO_OP}", and its description must say what stays as it is`],
  [(options) => options.length >= 3, 'at least one valid alternative must come with the recommendation and the no-op'],
  [(options) => options.every((o) => o.description?.trim()), 'every option must have a description that explains it'],
];

const findGap = (options) => RULES.find(([holds]) => !holds(options))?.[1];

const input = JSON.parse(readFileSync(0, 'utf8'));
const gaps = (input.tool_input?.questions ?? [])
  .map((q) => [q.question, findGap(q.options ?? [])])
  .filter(([, gap]) => gap);

if (gaps.length > 0) {
  const lines = gaps.map(([question, gap]) => `- "${question}": ${gap}.`);
  process.stderr.write(`Blocked by .claude/hooks/decision-gate.mjs:\n${lines.join('\n')}\n`);
  process.exit(2);
}
