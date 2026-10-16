---
name: after-merge
description: Syncs the local repo after the owner merges a pull request. Use when the user says a PR is merged, for example "merged", "PR #12 is merged" or "I merged it, clean up". Not for performing a merge or resolving conflicts.
argument-hint: "[pr-number]"
---

# After merge

Report only what a command showed; a step that failed is reported with its error.

1. Confirm the PR: `gh pr view <N> --json state,mergeCommit,headRefName,closingIssuesReferences` shows `MERGED`.
2. If `git status --porcelain` lists tracked changes, stop and ask the owner.
3. `git switch master`, `git pull --ff-only`, `git fetch --prune origin`.
4. For each local branch except `master`: find its merged PR (`gh pr list --head <branch> --state merged --json number`), run `git fetch origin pull/<PR>/head`, and if `git merge-base --is-ancestor <branch> FETCH_HEAD` passes, every local commit is in the merged PR: delete the branch with `git branch -D` (`-d` refuses a squash-merged branch). An ancestor, not an equal commit, because "Update branch" on GitHub adds a merge commit the local branch never gets. Keep any other branch and say why.
5. Each issue in `closingIssuesReferences` is `CLOSED` (`gh issue view <N> --json state`).
6. Report: the merge commit, deleted and kept branches, and the closed issues.
