# pa-tech.dev

Personal portfolio and blog. Static Astro 7 site (`output: 'static'`) on statichost.eu: vanilla CSS, Markdown and YAML content collections, Satori OG image, Vitest, Playwright. Structure follows Astro's conventions (`docs/adrs/002-astro-conventions.md`); path-scoped rules in `.claude/rules/` load when you touch matching files.

## Commands
- `pnpm check`: lint, `astro check`, unit tests with coverage. Run it before every commit.
- `pnpm exec vitest run <path>` for one test file while iterating.
- `pnpm build`, then `pnpm test:e2e`. WebKit runs in Podman: `pnpm test:e2e:webkit`.
- `pnpm astro sync` after editing `src/content.config.ts`.
- pnpm only; `npm`, `npx` and `yarn` are denied.

## Working rules
- Read the code, the git history (`git log -S`) and the official docs of the installed version before you change or recommend something, and cite the doc URL in the commit. Auto memory is off; knowledge lives in git, issues and PRs.
- Use the stack's native features as their docs describe. If none fits, ask before building something custom. A new dependency needs the owner's approval.
- No `any`, no `unknown`, no `as` casts (ESLint enforces it). Keep changes minimal: no refactors or defensive code beyond the task, except removing what the change makes obsolete (see Removing).
- Done means seen: `pnpm build`, run the site (`pnpm preview` or Playwright), look at the screenshots, and report what you saw.
- Add a lint rule, hook or test as a gate only for a mistake that recurred and is costly, and retire an obsolete gate in the same change. Content truth (CV text, posts) is checked by the owner, not by gates.

## Removing
Code, config, tests, docs, rules and dependencies are a cost to keep, not an asset. Remove anything that is demonstrably obsolete:
- Nothing uses it: no import, caller, link or reference (`git grep`), and the build and tests pass without it.
- It duplicates something that already does the job; keep the native or official one.
- Its reason is gone: the bug, decision, feature or dependency it served no longer exists.
- It only restates config or tests the tooling around the site instead of the site's behavior.
- An instruction Claude follows without it: ask "would removing this cause a mistake?" If not, cut it.

Before removing, find why it was added (`git log -S`, the PR or issue) and who uses it. If you can't tell why it exists, ask instead of guessing. When you change an area, remove what the change makes obsolete in the same PR. Ask the owner before removing visible content, a security control, or anything an ADR records.

## Workflow
1. One GitHub Task issue per change (`.github/ISSUE_TEMPLATE/task.yml`). Read it with `gh issue view <N>`.
2. Branch with `gh issue develop <N> --base master --name <type>/<N>-<slug> --checkout`.
3. Failing test first, then the code, until `pnpm check` passes. Conventional Commits.
4. Open the PR once `pnpm check`, the e2e run and the live check pass, with `.github/PULL_REQUEST_TEMPLATE.md`, `Closes #N` and a Conventional Commits title (it becomes the squash commit). The owner reviews and merges; then run the `after-merge` skill.

## Gotchas
- Commit by path: `git commit -- <paths>`. `git stash` is denied.
- `CLAUDE.md`, `.claude/`, `.github/`, `.husky/` and the root configs are read-only to sandboxed shell commands; edit them with the Edit or Write tool.
- `gh issue`, `gh pr`, `gh run` and `git push` have auth only as a standalone call outside the sandbox.
- Vitest has no content store: mock `astro:content` in specs and check real entries in Playwright on the built site. A running `astro dev` keeps its own store; restart it after a collection or branch change.
- Write temporary files in `$TMPDIR`; it is shared with other projects, so delete only your own files.

## Writing
Docs, commits, PR bodies and chat: active voice, short sentences, no emojis, no em-dashes, no flattery. Avoid: delve, robust, seamless, synergy, tapestry, cutting-edge, leverage, furthermore, moreover, ultimately, in conclusion, unlocking. Be a critical sparring partner. Ask owner decisions with `AskUserQuestion`: your recommendation first, at least one alternative, and a no-op option with its cost. End a hand-back with an "Open items" list, owner actions first.
