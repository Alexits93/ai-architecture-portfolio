// SessionStart hook: prints the open GitHub issue tree, the only plan this repo has, then the open Task
// linked to the current branch (via `gh issue develop`) with its newest handover comment. For an unlinked
// branch it falls back to the newest handover among the issues the branch's open PR closes.
// Claude Code adds plain SessionStart stdout to Claude's context. Exit codes cannot block SessionStart
// (exit 2 reaches only the user), so a failure prints a stop notice to stdout instead of passing silently.
import { spawnSync } from 'node:child_process';

const cwd = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

/** @param {string} command @param {string[]} args @returns {string} */
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.error?.message ?? result.stderr.trim());
  return result.stdout;
};

try {
  // Imported here so a module that fails to load still prints the stop notice below.
  const { truncatedConnections } = await import('../../.github/graphql-pages.mjs');
  /** @param {string} query @param {string[]} vars */
  const graphql = (query, vars = []) => {
    const { repository } = JSON.parse(
      run('gh', ['api', 'graphql', '-f', `query=${query}`, '-F', 'owner={owner}', '-F', 'repo={repo}', ...vars]),
    ).data;
    const truncated = truncatedConnections(repository);
    if (truncated.length > 0) throw new Error(`${truncated.join(', ')} hold more than one page, so the context would be incomplete`);
    return repository;
  };
  const {
  HANDOVER_QUERY,
  OPEN_PLAN_QUERY,
  PR_HANDOVER_QUERY,
  formatCurrentTask,
  formatPlan,
  formatPrHandover,
  latestHandover,
  linkedTask,
  } = await import('../../.github/workflow-rules.mjs');
  const issues = graphql(OPEN_PLAN_QUERY).issues.nodes;
  const branch = run('git', ['branch', '--show-current']).trim();
  const task = linkedTask(issues, branch);
  const current = task
    ? formatCurrentTask(branch, task, latestHandover(graphql(HANDOVER_QUERY, ['-F', `number=${task.number}`]).issue.comments.nodes))
    : formatPrHandover(branch, graphql(PR_HANDOVER_QUERY, ['-f', `branch=${branch}`]).pullRequests.nodes[0]);
  process.stdout.write(
    `Plan: open GitHub issues (Epic > Story > Task, native sub-issues):\n${formatPlan(issues)}\n\n${current}\n`,
  );
} catch (error) {
  process.stdout.write(
    `PLAN UNAVAILABLE: .claude/hooks/session-plan.mjs could not load the open issues (${error}).\n` +
      'The plan lives only in GitHub issues. Tell the user and do not start or continue a Task until `gh` works.\n',
  );
}
