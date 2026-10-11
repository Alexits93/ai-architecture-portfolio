import { describe, it, expect } from 'vitest';
import { truncatedConnections } from '../../.github/graphql-pages.mjs';
import {
  ISSUE_TEMPLATES,
  formatCurrentTask,
  formatPlan,
  formatPrHandover,
  HANDOVER_MARKER,
  HANDOVER_QUERY,
  LINKED_ISSUE_QUERY,
  OPEN_PLAN_QUERY,
  PR_HANDOVER_QUERY,
  latestHandover,
  linkedTask,
} from '../../.github/workflow-rules.mjs';

// The rules .claude/hooks/session-plan.mjs uses to load the plan and the handover into the context.
describe('plan rendering', () => {
  const issue = (number: number, parent: number | null, blockers: Array<[number, string]> = []) => ({
    number,
    title: `I${number}`,
    parent: parent === null ? null : { number: parent },
    blockedBy: { nodes: blockers.map(([n, state]) => ({ number: n, state })) },
    linkedBranches: { nodes: [] },
  });

  it('nests children and shows only open blockers', () => {
    const plan = formatPlan([issue(1, null), issue(2, 1, [[3, 'OPEN'], [9, 'CLOSED']]), issue(3, 1)]);
    expect(plan).toBe('- #1 I1\n  - #2 I2 (blocked by #3)\n  - #3 I3');
  });

  it('shows an issue whose parent is closed at the top level', () => {
    expect(formatPlan([issue(5, 99)])).toBe('- #5 I5');
  });

  it('says so when nothing is open', () => {
    expect(formatPlan([])).toBe('No open issues.');
  });
});

const task = (number: number, branches: string[]) => ({
  number,
  title: `[Task] T${number}`,
  parent: { number: 35 },
  blockedBy: { nodes: [] },
  linkedBranches: { nodes: branches.map((name) => ({ ref: { name } })) },
});

describe('handover comment', () => {
  const comment = (body: string, authorAssociation = 'OWNER') => ({ body, authorAssociation });

  it('picks the newest marked comment and ignores unmarked ones', () => {
    const comments = [
      comment(`${HANDOVER_MARKER}\nold`),
      comment(`${HANDOVER_MARKER}\nnew`),
      comment('Measured saving'),
    ];
    expect(latestHandover(comments)).toBe(`${HANDOVER_MARKER}\nnew`);
  });

  it('returns null without a marked comment', () => {
    expect(latestHandover([comment('Measured saving')])).toBeNull();
  });

  // Anyone who can comment can post the marker; only the owner's handover reaches the context.
  it('ignores a newer handover from anyone but the owner', () => {
    const comments = [comment(`${HANDOVER_MARKER}\nowner`), comment(`${HANDOVER_MARKER}\nother`, 'CONTRIBUTOR')];
    expect(latestHandover(comments)).toBe(`${HANDOVER_MARKER}\nowner`);
  });

  it('returns null when only others posted a handover', () => {
    expect(latestHandover([comment(`${HANDOVER_MARKER}\nother`, 'NONE')])).toBeNull();
  });
});

describe('current Task', () => {
  it('finds the open Task linked to the branch', () => {
    expect(linkedTask([task(62, []), task(63, ['chore/a'])], 'chore/a')).toMatchObject({ number: 63 });
  });

  it('finds nothing for an unlinked branch', () => {
    expect(linkedTask([task(63, ['chore/a'])], 'master')).toBeUndefined();
  });

  it('prints the Task and its handover', () => {
    expect(formatCurrentTask('chore/a', task(63, ['chore/a']), 'Next: tests')).toBe(
      'Current Task: #63 [Task] T63 (branch chore/a)\nHandover:\nNext: tests',
    );
  });

  it('says when the Task has no handover yet', () => {
    expect(formatCurrentTask('chore/a', task(63, ['chore/a']), null)).toBe(
      'Current Task: #63 [Task] T63 (branch chore/a)\nNo handover yet.',
    );
  });

  it('says when no Task is linked to the branch', () => {
    expect(formatCurrentTask('master', undefined, null)).toBe(
      'No open Task is linked to branch master. Create Task branches with `gh issue develop <N> --checkout`.',
    );
  });
});

describe('handover from the open PR of an unlinked branch', () => {
  const issue = (number: number, comments: Array<[string, string]>, authorAssociation = 'OWNER') => ({
    number,
    title: `[Task] T${number}`,
    comments: { nodes: comments.map(([createdAt, body]) => ({ createdAt, body, authorAssociation })) },
  });
  const pr = (...issues: Array<ReturnType<typeof issue>>) => ({ number: 46, closingIssuesReferences: { nodes: issues } });

  it('loads the newest handover by createdAt across the closing issues', () => {
    const open = pr(
      issue(63, [['2026-10-09T21:00:00Z', `${HANDOVER_MARKER}\nnewest`], ['2026-10-09T22:00:00Z', 'Measured']]),
      issue(62, [['2026-10-09T20:00:00Z', `${HANDOVER_MARKER}\nolder`]]),
      issue(33, []),
    );
    expect(formatPrHandover('chore/x', open)).toBe(
      'Branch chore/x is not linked to a Task. Open PR #46 closes #63, #62, #33.\n' +
        `Current Task: #63 [Task] T63 (newest handover in PR #46)\nHandover:\n${HANDOVER_MARKER}\nnewest`,
    );
  });

  it('names the PR when no closing issue has a handover', () => {
    expect(formatPrHandover('chore/x', pr(issue(33, [['2026-10-09T20:00:00Z', 'Measured']])))).toBe(
      'Branch chore/x is not linked to a Task. Open PR #46 closes #33.\nNo handover yet.',
    );
  });

  it('ignores a newer handover from anyone but the owner', () => {
    const open = pr(
      issue(63, [['2026-10-09T21:00:00Z', `${HANDOVER_MARKER}\nowner`]]),
      issue(62, [['2026-10-09T23:00:00Z', `${HANDOVER_MARKER}\nother`]], 'CONTRIBUTOR'),
    );
    expect(formatPrHandover('chore/x', open)).toContain(`Handover:\n${HANDOVER_MARKER}\nowner`);
  });

  it('falls back to the unlinked message without an open PR', () => {
    expect(formatPrHandover('master', undefined)).toBe(formatCurrentTask('master', undefined, null));
  });
});

describe('queries fail closed past one page', () => {
  const page = (more: boolean) => ({ hasNextPage: more, hasPreviousPage: false });

  it('names every connection that has more items than its page', () => {
    const data = {
      issues: {
        pageInfo: page(false),
        nodes: [
          { blockedBy: { pageInfo: page(true), nodes: [] }, linkedBranches: { pageInfo: page(false), nodes: [] } },
          { comments: { pageInfo: { hasNextPage: false, hasPreviousPage: true }, nodes: [] } },
        ],
      },
    };
    expect(truncatedConnections(data)).toEqual(['issues.nodes.0.blockedBy', 'issues.nodes.1.comments']);
  });

  it('finds nothing when every page is complete', () => {
    expect(truncatedConnections({ issue: { labels: { pageInfo: page(false), nodes: [{ name: 'task' }] }, parent: null } })).toEqual([]);
  });

  // A connection without pageInfo would be cut off silently.
  it.each([
    ['OPEN_PLAN_QUERY', OPEN_PLAN_QUERY],
    ['HANDOVER_QUERY', HANDOVER_QUERY],
    ['PR_HANDOVER_QUERY', PR_HANDOVER_QUERY],
    ['LINKED_ISSUE_QUERY', LINKED_ISSUE_QUERY],
  ])('%s asks for pageInfo on every paged connection', (_name, query) => {
    const connections = [...query.matchAll(/\w+\([^)]*\b(?:first|last): \d+[^)]*\) \{ (\w+)/g)].map((m) => m[1]);
    expect(connections.length).toBeGreaterThan(0);
    expect(connections.every((field) => field === 'pageInfo')).toBe(true);
  });

  it('pages comments from the newest end and checks the older side', () => {
    expect(HANDOVER_QUERY).toMatch(/comments\(last: \d+\) \{ pageInfo \{ hasPreviousPage \}/);
    expect(PR_HANDOVER_QUERY).toMatch(/comments\(last: \d+\) \{ pageInfo \{ hasPreviousPage \}/);
  });
});

describe('plan query', () => {
  // Applying a label needs triage rights, so an issue anyone opens stays out of the context.
  it('asks only for issues with an issue template label', () => {
    const labels = Object.values(ISSUE_TEMPLATES).map((rule) => rule.label);
    expect(OPEN_PLAN_QUERY).toContain(`labels: ${JSON.stringify(labels)}`);
  });

  it('asks for the comment author association in both handover queries', () => {
    expect(HANDOVER_QUERY).toContain('authorAssociation');
    expect(PR_HANDOVER_QUERY).toContain('authorAssociation');
  });
});
