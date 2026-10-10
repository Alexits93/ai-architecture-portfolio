# pa-tech.dev

Personal portfolio and blog. Static Astro 7 site (`output: 'static'`) on statichost.eu: vanilla CSS, Markdown content collections, Satori OG images, Vitest, Playwright. Structure follows Astro's conventions (`docs/adrs/002-astro-conventions.md`), import boundaries enforced by ESLint.

Plan: the open GitHub issues (Epic > Story > Task as native sub-issues, order as blocked-by links). `.claude/hooks/session-plan.mjs` loads the tree into context at session start, plus the open Task linked to the current branch and its newest handover (for an unlinked branch: the newest handover among the issues its open PR closes). "continue" means: resume that Task from that handover. The repo has no plan files. If the hook prints `PLAN UNAVAILABLE`, stop and tell the user.

## Base rules
1. You run inside VS Code. Use its tools to check and improve your work: the Problems panel through `mcp__ide__getDiagnostics` (CLI) or `mcp__claude-vscode__getDiagnostics` (chat panel), and the installed extensions (`code --list-extensions --show-versions`, unsandboxed). If the `ide` server is not connected, tell the user to run `/ide` or reload the window.
2. Auto memory is off (`autoMemoryEnabled: false`). Repository history and knowledge live only in git history (`git log -S`, `git show`) and GitHub issues and PRs (`gh issue view`, `gh pr view`). Never work from memory, training data or assumption: before starting a task, read the relevant history, issues, code and official docs, and say what you verified.
3. Live check before every "done": `pnpm build`, run the site (`pnpm preview`, or headed Playwright so the owner can watch), use the change in a real browser, read the screenshots, and report what you saw. Passing tests alone are not done.
4. Use the whole host before you call something uncheckable or hand it to the owner: Linux (KDE Wayland, AT-SPI, Orca), VS Code (Problems panel, Playwright, Vitest and Firefox debugger extensions) and Podman (containers for browsers and services the host lacks). Say which of the three you used.
5. Report a subagent or skill result only from its task notification. Until it arrives, say it is still running and do not ask the owner to decide on it.

## Commands
- `pnpm check`: lint + `astro check` + unit tests with coverage. Run it before every commit and show its result as evidence.
- `pnpm exec vitest run <path>` for one test file while iterating (no coverage, so per-file thresholds do not fail). `pnpm test:e2e` needs `pnpm build` first.
- `pnpm astro sync` after editing `src/content.config.ts`.
- pnpm only. `npm`, `npx` and `yarn` are denied in `.claude/settings.json`.

## Workflow
1. Spec and devspec in the Task issue body (format in `.claude/rules/docs.md`), never as repo files. Code and tests are the truth once it ships.
2. Failing test, then implementation until `pnpm check` passes.
3. Open the issue before the branch: Epic > Story > Task, from `.github/ISSUE_TEMPLATE`, created with `gh issue create --parent <N>` so the parent is a native sub-issue link. Encode order with `gh issue edit <N> --add-blocked-by <M>`. One branch per Task (`feat/`, `fix/`, `chore/`), created and pushed with `gh issue develop <N> --base <branch> --name <branch> --checkout` so GitHub links it to the Task. Conventional Commits (commitlint enforced).
4. PR body follows `.github/PULL_REQUEST_TEMPLATE.md`, passed with `--body-file`. `Closes #N` references the Story or Task issue, never the PR. The PR title is the squash commit and must pass commitlint. Under "Unverified Risks" rate every open gap (screen readers, Safari, small viewports) in the table `| Gap | Risk | Why | Tracked in |` as Low, Medium or High, because passing tests do not prove UX. Medium and High block the PR: close the gap or reduce it to Low first. Chat reports state gaps the same way. `.claude/hooks/pr-gate.mjs` and CI `pr-lint` enforce this with `.github/workflow-rules.mjs`, including that each closed issue is an open Story or Task with a native parent.

Path-scoped rules in `.claude/rules/` load automatically when you touch matching files.

## Git and sandbox
- Commit part of the tree by path: `git commit -- <paths>`. `git stash` is denied, because the sandbox mounts gate configs read-only and a stash cannot restore them.
- Before a command that rewrites the worktree or index, or publishes: check which hooks it triggers (lint-staged stashes) and which paths are protected, and save `git diff > "$TMPDIR/wip.patch"` first.
- `excludedCommands` in `.claude/settings.json` apply only to a standalone call: a `cd`, `;`, `&&`, redirect or `$(...)` keeps it sandboxed.
- A sandboxed test that fails with ENOTDIR or EACCES on `.claude/*` or a shell startup file hit a protected-path placeholder: rerun it unsandboxed, never change the test.
- Publish (`gh ... --body-file`, `git push`) only in a later turn than the write that produces its content, after that write succeeded. Write a new file name in `$TMPDIR`; the Read tool cannot open one to overwrite it.

## Engineering rules
- Native and official solutions only: use the built-in capabilities of the tools in this stack (Astro, TypeScript, ESLint, Vitest, Playwright, pnpm, GitHub, Claude Code) as their docs describe. No custom scripts, workarounds or "creative" solutions. If no native option exists, stop and discuss alternatives with the user before building anything.
- Code ported from the legacy web-components app, and every decision an earlier agent made, follows this stack's documented conventions. Neither is a reason by itself: keep a pattern only with an official source for this stack.
- A new dependency needs evidence that no native option exists, and the user approves it.
- Research before acting: before you use or recommend any tool, API or config key, read its official docs for the version installed here, and cite the URL with that version in the commit and in the Task's Sources. The installed version must be the latest stable release, or the latest usable one where a needed API is not stable yet. `.github/workflows/outdated.yml` reports drift weekly and never blocks a PR. A link you have not read in this session is not a source. Training data lags this stack (Astro 7, pnpm 12, current Baseline features).
- Principles, methods and patterns (architecture, testing, tooling choices): judge their fit for this project with evidence, not popularity, and ask the critic or domain-expert subagent where it helps.
- Size a fix from the code it would change, read in this session, before you recommend doing or deferring it. The owner decides on that estimate.
- No `any`, no `unknown`, no `as` casts to bypass types (ESLint enforced).
- A new architectural rule ships with the ESLint, TypeScript or test gate that enforces it. A rule that exists only in Markdown is a suggestion.
- Keep changes minimal: no refactors, abstractions or defensive code beyond the task.

## Writing style
Applies to docs, commit messages, PR bodies and chat.
- Banned words: delve, robust, seamless, synergy, tapestry, cutting-edge, leverage, furthermore, moreover, ultimately, in conclusion, unlocking.
- No emojis, no em-dashes. Active voice, short sentences, no flattery.
- Act as a critical sparring partner: challenge weak ideas with evidence instead of agreeing.

## Context hygiene
- A mistake you make, or a correction from the user, becomes a gate in the same change: a `permissions.deny` rule, hook or test, pinned in `tests/architecture/agent-context.spec.ts`. Only when no gate can enforce it, write one concrete line in this file or the matching rule.
- Do not commit memory, session-log or scratch files to the repo. Durable knowledge goes into this file, `.claude/rules/`, an ADR, or the relevant issue, by editing the existing text rather than appending.
- When compacting, keep: the current story, files modified so far, the last `pnpm check` result, and open decisions.
- Before the session context reaches 150k tokens, stop and post a no-loss handover (the status line in `.claude/settings.json` shows `HANDOVER NOW` from 130k) as a comment on the current Task with `gh issue comment <N> --body-file`, first line `<!-- handover -->`. Never paste it into chat. Contents: branch and commits (git-verified), the last `pnpm check` result, files modified, open items in priority order, user decisions and pending approvals, sandbox notes, and cited sources with full URLs.
