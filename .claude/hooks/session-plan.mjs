// SessionStart hook: prints the open GitHub issue tree, the only plan this repo has, then the open Task
// linked to the current branch (via `gh issue develop`) with its newest handover comment.
// Claude Code adds plain SessionStart stdout to Claude's context. Exit codes cannot block SessionStart
// (exit 2 reaches only the user), so a failure prints a stop notice to stdout instead of passing silently.
import { spawnSync } from 'node:child_process';
import {
  HANDOVER_QUERY,
  OPEN_PLAN_QUERY,
  formatCurrentTask,
  formatPlan,
  latestHandover,
  linkedTask,
} from '../../.github/workflow-rules.mjs';

const cwd = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

/** @param {string} command @param {string[]} args @returns {string} */
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.error?.message ?? result.stderr.trim());
  return result.stdout;
};

/** @param {string} query @param {string[]} vars */
const graphql = (query, vars = []) =>
  JSON.parse(run('gh', ['api', 'graphql', '-f', `query=${query}`, '-F', 'owner={owner}', '-F', 'repo={repo}', ...vars]))
    .data.repository;

try {
  const { nodes: issues, pageInfo } = graphql(OPEN_PLAN_QUERY).issues;
  if (pageInfo.hasNextPage) throw new Error('more than 100 open issues, so the tree would be incomplete');
  const branch = run('git', ['branch', '--show-current']).trim();
  const task = linkedTask(issues, branch);
  const handover = task
    ? latestHandover(graphql(HANDOVER_QUERY, ['-F', `number=${task.number}`]).issue.comments.nodes)
    : null;
  process.stdout.write(
    `Plan: open GitHub issues (Epic > Story > Task, native sub-issues):\n${formatPlan(issues)}\n\n` +
      `${formatCurrentTask(branch, task, handover)}\n`,
  );
} catch (error) {
  process.stdout.write(
    `PLAN UNAVAILABLE: .claude/hooks/session-plan.mjs could not load the open issues (${error}).\n` +
      'The plan lives only in GitHub issues. Tell the user and do not start or continue a Task until `gh` works.\n',
  );
}
