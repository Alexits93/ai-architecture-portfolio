// Branch link rule shared by .github/workflows/pr-lint.yml (CI) and .claude/hooks/pr-gate.mjs (local).
// GitHub links a PR to the issue its branch was created for (gh issue develop) and closes every linked issue
// on merge, whatever the body says (#185). Before the PR exists, the open issues' linkedBranches show the link;
// after, the PR's closingIssuesReferences does (https://docs.github.com/en/graphql/reference/pulls).

export const BRANCH_LINKS_QUERY = `query($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    issues(states: OPEN, first: 100) { pageInfo { hasNextPage }
      nodes { number linkedBranches(first: 10) { pageInfo { hasNextPage } nodes { ref { name } } } }
    }
  }
}`;

export const PR_CLOSING_QUERY = `query($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) { closingIssuesReferences(first: 50) { pageInfo { hasNextPage } nodes { number } } }
  }
}`;

/**
 * @param {Array<{ number: number, linkedBranches: { nodes: Array<{ ref: { name: string } | null }> } }>} issues
 * @param {string} branch @returns {number[]}
 */
export const issuesLinkedToBranch = (issues, branch) =>
  issues.filter((i) => i.linkedBranches.nodes.some((b) => b.ref?.name === branch)).map((i) => i.number);

/** @param {number[]} closed the body's Closes #N @param {number[]} linked issues the merge closes @returns {string[]} */
export const findUnclosedLinkViolations = (closed, linked) =>
  linked
    .filter((number) => !closed.includes(number))
    .map(
      (number) =>
        `Merging closes #${number}: it is linked to the PR or its branch, but the body does not close it. ` +
        `Add "Closes #${number}" if the PR ships it, else open the PR from a branch made with gh issue develop for the right issue.`,
    );
