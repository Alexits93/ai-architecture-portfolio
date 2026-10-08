#!/usr/bin/env node
import fs from 'fs';
const input = fs.readFileSync(0, 'utf-8');
const payload = JSON.parse(input);

const toolCall = payload.toolCall;
if (toolCall && toolCall.name === 'run_command' && toolCall.args && toolCall.args.CommandLine) {
  const cmd = toolCall.args.CommandLine;
  if (cmd.includes('gh pr create')) {
    if (cmd.includes('safe-pr-create.sh')) {
      console.log(JSON.stringify({ decision: 'allow' }));
      process.exit(0);
    } else {
      console.log(JSON.stringify({
        decision: 'deny',
        reason: 'Direct usage of "gh pr create" is blocked by the deterministic PR safeguard. You MUST use ".agents/scripts/safe-pr-create.sh <body-file> [args]" to create PRs.'
      }));
      process.exit(0);
    }
  }
}
console.log(JSON.stringify({ decision: 'allow' }));
