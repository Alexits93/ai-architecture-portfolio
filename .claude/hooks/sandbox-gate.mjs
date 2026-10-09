// PreToolUse hook (Bash): sandbox.excludedCommands run unsandboxed only as a standalone call.
// A cd, chain, pipe, redirect or substitution keeps the whole call sandboxed
// (https://code.claude.com/docs/en/sandboxing), so it fails and invites an unsandboxed retry that
// widens far more than the one command. This hook blocks those calls instead.
// Exit 2 blocks the tool call and sends stderr to Claude. A crash also blocks, so the gate never fails open.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

try {
  const settings = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'settings.json'), 'utf8'));
  // `gh issue *` matches `gh issue` with or without arguments, the same as a Bash(...) rule.
  const prefixes = (settings.sandbox?.excludedCommands ?? []).map((entry) => entry.replace(/\s\*$/, ''));
  const input = JSON.parse(readFileSync(0, 'utf8'));
  // Quoted text is data, not shell syntax: a jq filter or commit message may contain | or ;.
  // Double quotes still run $(...) and backticks, so substitutions are checked before they go.
  const noSingle = (input.tool_input?.command ?? '').replace(/'[^']*'/g, "''");
  const unquoted = noSingle.replace(/"[^"]*"/g, '""');
  const segments = unquoted.split(/&&|\|\||[;|\n]/).map((segment) => segment.trim());
  const excluded = prefixes.find((prefix) => segments.some((s) => s === prefix || s.startsWith(`${prefix} `)));
  const standalone = segments.length === 1 && !/[<>]/.test(unquoted) && !/`|\$\(/.test(noSingle);
  if (excluded && !standalone) {
    process.stderr.write(
      `Blocked by .claude/hooks/sandbox-gate.mjs:\n- \`${excluded}\` is in sandbox.excludedCommands and runs unsandboxed only as a standalone call. Run it alone: no cd, ;, &&, |, redirect or substitution, and no dangerouslyDisableSandbox.\n`,
    );
    process.exit(2);
  }
} catch (error) {
  process.stderr.write(`sandbox-gate hook crashed, blocking the call: ${error}\n`);
  process.exit(2);
}
