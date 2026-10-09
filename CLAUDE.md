# pa-tech.dev

Personal portfolio and blog. Static Astro 7 site (`output: 'static'`) on Cloudflare Pages: vanilla CSS, Markdown content collections, Satori OG images, Vitest, Playwright, ESLint with Feature-Sliced Design rules.

Current plan: `docs/exec-plans/modernization-and-security.plan.md`. Read it before starting a story.

## Commands
- `pnpm check`: lint + `astro check` + unit tests with coverage. Run it before every commit and show its result as evidence.
- `pnpm exec vitest run <path>` for one test file while iterating (no coverage, so per-file thresholds do not fail). `pnpm test:e2e` needs `pnpm build` first.
- `pnpm astro sync` after editing `src/content.config.ts`.
- pnpm only. `npm`, `npx` and `yarn` are denied in `.claude/settings.json`.

## Workflow
1. Spec and devspec in `docs/exec-plans/` (format in `.claude/rules/docs.md`).
2. Failing test, then implementation until `pnpm check` passes.
3. One branch per change (`feat/`, `fix/`, `chore/`), Conventional Commits (commitlint enforced).
4. PR body follows `.github/PULL_REQUEST_TEMPLATE.md`. `Closes #N` references the Story or Task issue, never the PR. Under "Unverified Risks" list real blind spots (screen readers, Safari, small viewports), because passing tests do not prove UX.

Path-scoped rules in `.claude/rules/` load automatically when you touch matching files. Legacy component migration: `/migrate-legacy <name>`.

## Engineering rules
- Native first: solve with Astro, TypeScript, Vitest, Node or the platform before adding a dependency. A new dependency needs evidence that no native option exists, and the user approves it.
- Verify framework and browser APIs against current official docs before using them. Training data lags Astro 7 and current Baseline features.
- No `any`, no `unknown`, no `as` casts to bypass types (ESLint enforced).
- A new architectural rule ships with the ESLint, TypeScript or test gate that enforces it. A rule that exists only in Markdown is a suggestion.
- Keep changes minimal: no refactors, abstractions or defensive code beyond the task.

## Writing style
Applies to docs, commit messages, PR bodies and chat.
- Banned words: delve, robust, seamless, synergy, tapestry, cutting-edge, leverage, furthermore, moreover, ultimately, in conclusion, unlocking.
- No emojis, no em-dashes. Active voice, short sentences, no flattery.
- Act as a critical sparring partner: challenge weak ideas with evidence instead of agreeing.

## Context hygiene
- Do not commit memory, session-log or scratch files to the repo. Durable knowledge goes into this file, `.claude/rules/`, or the relevant spec, by editing the existing text rather than appending.
- When compacting, keep: the current story, files modified so far, the last `pnpm check` result, and open decisions.
