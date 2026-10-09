# pa-tech.dev

Personal portfolio and blog. Static Astro 7 site (`output: 'static'`) on statichost.eu: vanilla CSS, Markdown content collections, Satori OG images, Vitest, Playwright, ESLint with Feature-Sliced Design rules.

Plan: the open GitHub issues (Epic > Story > Task as native sub-issues, order as blocked-by links). `.claude/hooks/session-plan.mjs` loads the tree into context at session start. The repo has no plan files. If the hook prints `PLAN UNAVAILABLE`, stop and tell the user.

## Commands
- `pnpm check`: lint + `astro check` + unit tests with coverage. Run it before every commit and show its result as evidence.
- `pnpm exec vitest run <path>` for one test file while iterating (no coverage, so per-file thresholds do not fail). `pnpm test:e2e` needs `pnpm build` first.
- `pnpm astro sync` after editing `src/content.config.ts`.
- pnpm only. `npm`, `npx` and `yarn` are denied in `.claude/settings.json`.

## Workflow
1. Spec and devspec in the Task issue body (format in `.claude/rules/docs.md`), never as repo files. Code and tests are the truth once it ships.
2. Failing test, then implementation until `pnpm check` passes.
3. Open the issue before the branch: Epic > Story > Task, from `.github/ISSUE_TEMPLATE`, created with `gh issue create --parent <N>` so the parent is a native sub-issue link. Encode order with `gh issue edit <N> --add-blocked-by <M>`. One branch per Task (`feat/`, `fix/`, `chore/`), Conventional Commits (commitlint enforced).
4. PR body follows `.github/PULL_REQUEST_TEMPLATE.md`, passed with `--body-file`. `Closes #N` references the Story or Task issue, never the PR. The PR title is the squash commit and must pass commitlint. Under "Unverified Risks" list real blind spots (screen readers, Safari, small viewports), because passing tests do not prove UX. `.claude/hooks/pr-gate.mjs` and CI `pr-lint` enforce this with `.github/workflow-rules.mjs`, including that each closed issue is an open Story or Task with a native parent.

Path-scoped rules in `.claude/rules/` load automatically when you touch matching files.

## Engineering rules
- Native and official solutions only: use the built-in capabilities of the tools in this stack (Astro, TypeScript, ESLint, Vitest, Playwright, pnpm, GitHub, Claude Code) as their docs describe. No custom scripts, workarounds or "creative" solutions. If no native option exists, stop and discuss alternatives with the user before building anything.
- A new dependency needs evidence that no native option exists, and the user approves it.
- Research before acting: before you use or recommend any tool, API, config key, method or concept, check current official docs or primary sources on the web, and cite them in your answer or commit. Training data and memory lag this stack (Astro 7, pnpm 12, current Baseline features), and guesses waste tokens on outdated attempts.
- No `any`, no `unknown`, no `as` casts to bypass types (ESLint enforced).
- A new architectural rule ships with the ESLint, TypeScript or test gate that enforces it. A rule that exists only in Markdown is a suggestion.
- Keep changes minimal: no refactors, abstractions or defensive code beyond the task.

## Writing style
Applies to docs, commit messages, PR bodies and chat.
- Banned words: delve, robust, seamless, synergy, tapestry, cutting-edge, leverage, furthermore, moreover, ultimately, in conclusion, unlocking.
- No emojis, no em-dashes. Active voice, short sentences, no flattery.
- Act as a critical sparring partner: challenge weak ideas with evidence instead of agreeing.

## Context hygiene
- Do not commit memory, session-log or scratch files to the repo. Durable knowledge goes into this file, `.claude/rules/`, an ADR, or the relevant issue, by editing the existing text rather than appending.
- When compacting, keep: the current story, files modified so far, the last `pnpm check` result, and open decisions.
- Before the session context reaches 150k tokens, stop and write a no-loss handover prompt (the status line in `.claude/settings.json` shows `HANDOVER NOW` from 130k) for the next session: branch and commits (git-verified), the last `pnpm check` result, files modified, open items in priority order, user decisions and pending approvals, sandbox notes, and cited sources with full URLs.
