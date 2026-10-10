---
name: after-merge
description: Reconciles the repository after a pull request is merged, so the next session starts from the latest git state with nothing lost. Syncs master, deletes local branches whose work is verified on master, confirms closed issues, ticks the parent Story criteria, finds stale references in docs and issues, and posts the handover. Use when the user reports a merge, for example "merged", "PR #12 is merged", "I merged it, clean up", or asks to sync with git, reconcile or do the handover after a merge. Not for performing a merge or resolving merge conflicts.
argument-hint: "[pr-number]"
---

# After merge

Do every step yourself. Report only what a command in this session showed. A step you could not run is reported as not done, with the error, never as done.

Copy this checklist into your reply and tick it as you go:

```
After merge:
- [ ] 1. Merged PR identified
- [ ] 2. master synced with origin
- [ ] 3. Merged local branches deleted, others kept
- [ ] 4. Closed issues confirmed, parent Story criteria ticked
- [ ] 5. Stale references found and fixed or tracked
- [ ] 6. Handover posted
- [ ] 7. Final state verified
```

## 1. Identify the merged PR

Use the PR number from `$ARGUMENTS` or the user's message. Otherwise take the newest merged PR:

```bash
gh pr list --state merged --limit 5 --json number,title,headRefName,mergeCommit,closingIssuesReferences
```

Confirm `state` is `MERGED` with `gh pr view <N> --json state,mergeCommit,headRefName,closingIssuesReferences`. If `gh` fails (no network, no auth), note it and continue with the git steps; steps 4 to 6 then stay not done.

## 2. Sync master

1. `git status --porcelain`: if the tree is dirty, save `git diff > "$TMPDIR/after-merge-wip.patch"` and stop to ask the user. Never `git stash`, never discard changes.
2. `git checkout master`, then `git pull --ff-only`, then `git fetch --prune origin`.
3. A release workflow may push a `chore(release)` commit after the merge. Check `gh run list --branch master --limit 3`; if a run is in progress, wait for it and pull again.

## 3. Delete merged local branches

For each local branch except `master`:

1. Find its squash commit on master: the commit whose subject ends with `(#<PR>)` for the PR that branch opened (`gh pr list --state merged --head <branch> --json number`, or `git log --oneline origin/master --grep "(#<PR>)"`).
2. Compare trees: `git diff --quiet <branch> <squash-commit>`. Equal means every change of the branch is on master.
3. Equal: `git branch -D <branch>`. Not equal, no merged PR, or unpushed commits: keep it and list it in the report.

Never push a branch delete. GitHub deletes head branches on merge; `git fetch --prune` removes the stale refs. List any remote branch that still exists for a merged PR.

## 4. Update the issues

1. Each issue in `closingIssuesReferences` is `CLOSED` (`gh issue view <N> --json state`).
2. Find the parent Story (`gh issue view <N> --json parent`, or the Task body). Tick each acceptance criterion the merged work completes; leave partial ones unticked and say what is missing. Edit by writing the new body to a new file in `$TMPDIR`, then `gh issue edit <Story> --body-file <file>` in a later step.
3. If every criterion and sub-issue of the Story is done, tell the user; do not close a Story or Epic yourself.

## 5. Stale references

1. List what the merge removed or renamed: `git show --stat <squash-commit>` and the removed identifiers in `git show <squash-commit>`.
2. Search for them in `docs/`, `.claude/`, `CLAUDE.md`, `README.md` and open issues (`gh issue list --state open --search "<identifier>"`).
3. A stale issue body: edit it. A stale repo file: open a `chore` Task for it; repo files change only through a PR.

## 6. Handover

Post it on the next open Task, or on the parent Story when no Task is open. Write the body to a new file in `$TMPDIR`, then publish it in a later step with `gh issue comment <N> --body-file <file>`. First line `<!-- handover -->`. Contents: branch and commits (git-verified), the last `pnpm check` result, files modified, open items in priority order, user decisions and pending approvals, sandbox notes, sources with full URLs, and the phrase that starts the next session ("continue from the handover on #N").

## 7. Verify and report

1. `git status -sb` shows `## master...origin/master` with no ahead or behind and a clean tree.
2. `git branch` lists only `master` and the branches you kept on purpose.
3. Report the ticked checklist, each deleted and kept branch with the reason, each issue change with its URL, and every step not done with its error.
