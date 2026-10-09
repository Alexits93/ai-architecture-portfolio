// SessionStart hook: prints the open GitHub issue tree, the only plan this repo has.
// Claude Code adds plain SessionStart stdout to Claude's context. Exit codes cannot block SessionStart
// (exit 2 reaches only the user), so a failure prints a stop notice to stdout instead of passing silently.
import { spawnSync } from 'node:child_process';
import { OPEN_PLAN_QUERY, formatPlan } from '../../.github/workflow-rules.mjs';

try {
  const result = spawnSync(
    'gh',
    ['api', 'graphql', '-f', `query=${OPEN_PLAN_QUERY}`, '-F', 'owner={owner}', '-F', 'repo={repo}'],
    { cwd: process.env.CLAUDE_PROJECT_DIR ?? process.cwd(), encoding: 'utf8' },
  );
  if (result.status !== 0) throw new Error(result.error?.message ?? result.stderr.trim());
  const issues = JSON.parse(result.stdout).data.repository.issues.nodes;
  process.stdout.write(`Plan: open GitHub issues (Epic > Story > Task, native sub-issues):\n${formatPlan(issues)}\n`);
} catch (error) {
  process.stdout.write(
    `PLAN UNAVAILABLE: .claude/hooks/session-plan.mjs could not load the open issues (${error}).\n` +
      'The plan lives only in GitHub issues. Tell the user and do not start or continue a Task until `gh` works.\n',
  );
}
