# Project: AI Architecture Portfolio

Personal portfolio and blog. Static Astro site (`output: 'static'`) on Cloudflare Pages. Stack: Astro, vanilla CSS, Satori (OG images), Nano Stores, Vitest, Playwright, ESLint (FSD boundaries).

Legacy source being migrated: `/home/patrika/Documents/projects/web-components/` (outside this repo). Migration workflow: `docs/skills/legacy-migration-protocol.md`.

Current plan (source of truth): `docs/exec-plans/modernization-and-security.plan.md`. Rationale: `docs/exec-plans/plan-and-security-review.md`. Read both before starting a story. Tick items only when merged to `master`.

## Commands
- `pnpm check` runs lint, `astro check`, and unit tests with coverage. Run it before every commit.
- `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm test:e2e` / `pnpm build`
- `pnpm astro sync` after editing `src/content.config.ts`.

## Role
Act as a critical sparring partner for a Lead AI Engineer. Challenge weak ideas. Verify framework APIs against current official docs, not memory.

## Writing rules
- Banned words: delve, robust, seamless, synergy, tapestry, cutting-edge, leverage, furthermore, moreover, ultimately, in conclusion, unlocking.
- No emojis. No em-dashes.
- Active voice, short sentences, no flattery.

## Workflow (SDD + TDD)
1. Spec: `docs/exec-plans/<name>.spec.md`
2. DevSpec (behavioral matrix): `<name>.devspec.md`
3. Failing test (Vitest `*.spec.ts` co-located; page tests in `tests/`; journeys in `e2e/`)
4. Implement until green.

Branch per change (`feat/`, `fix/`, `chore/`). Conventional Commits (commitlint enforced). PRs follow `.github/PULL_REQUEST_TEMPLATE.md`, `Closes #N` must reference the Story/Task issue. `pr-lint.yml` enforces this. Fill "Unverified Risks" with real blind spots (a11y, Safari, small viewports).

## Architecture rules
- Feature-Sliced Design: `app > pages > widgets > features > entities > shared`. Import slices only through their `index.ts` via `@/` paths.
- Global tokens and layout CSS live in `src/shared/styles/` (pages may not import `app`).
- HTML-first: if native HTML/CSS (`<dialog>`, `:checked`, `:target`, `:has()`) can hold the state, no `<script>`.
- No `any`, no `unknown`, no `as` casts to bypass types.
- Native-first: no new dependency without proof that Astro/TS/Vitest/Node cannot do it.
- A new architectural rule ships with the ESLint/TS/test gate that enforces it. Prose is not enforcement.

Detailed rules: `docs/manifestos/` (read the relevant one before structural changes).

## Testing notes
- Astro components: `experimental_AstroContainer` in Vitest with `environment: 'node'`, parse output with JSDOM.
- AstroContainer inherits `site` from `astro.config.mjs`. Do not test for an undefined `site`.
- Client `<script>` behaviour is only testable in Playwright.

## Context hygiene
- Do not create `MEMORY.md`, `.claudememory`, or chronological log files.
- Do not write raw JSON dumps, terminal traces, or debugging narratives to any file.
- Update docs by overwriting and compressing. See `docs/manifestos/10-memory-and-context-manifesto.md`.
