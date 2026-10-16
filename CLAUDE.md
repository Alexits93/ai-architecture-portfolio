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
- Accessibility questions are not owner decisions: research WCAG and the ARIA Authoring Practices Guide, check the running page, decide, and report the result.
- Use the stack's native features as their docs describe. If none fits, ask before building something custom. A new dependency needs the owner's approval.
- Comments say why the code is as it is. Issue numbers, dates and history go in the commit, except a gate's failure (below).
- Keep changes minimal: no refactors or defensive code beyond the task, except removing what the change makes obsolete (see Removing).
- Done means seen: `pnpm build`, run the site (`pnpm preview` or Playwright), look at the screenshots, and report what you saw.
- Add a lint rule, hook or test as a gate only for a mistake that recurred and is costly. Its comment names the real failure it answers (a CI run, PR or commit); no real failure, no gate. Retire an obsolete gate in the same change. Content truth (CV text, posts) is checked by the owner, not by gates.

## Removing
Code, config, tests, docs, rules and dependencies are a cost to keep, not an asset. Remove anything that is demonstrably obsolete:
- Nothing uses it: no import, caller, link or reference (`git grep`), and the build and tests pass without it.
- It duplicates something that already does the job; keep the native or official one.
- Its reason is gone: the bug, decision, feature or dependency it served no longer exists.
- It only restates config or tests the tooling around the site instead of the site's behavior.
- An instruction Claude follows without it: ask "would removing this cause a mistake?" If not, cut it.

Before removing, find why it was added (`git log -S`, the PR or issue) and who uses it. If you can't tell why it exists, ask instead of guessing. When you change an area, remove what the change makes obsolete in the same PR. Ask the owner before removing visible content, a security control, or anything an ADR records.

## Workflow
0. Start of a session: `pnpm build && pnpm exec playwright test --project=chromium`. Fix anything the last session left broken before new work.
1. One GitHub Task issue per change (`.github/ISSUE_TEMPLATE/task.yml`). One PR, and one session, may close several Tasks that touch the same files. Read each with `gh issue view <N>`.
2. Branch with `gh issue develop <N> --base master --name <type>/<N>-<slug> --checkout`.
3. A test for the behavior at risk (a regression test first for a bug, see `.claude/rules/testing.md`), then the code, until `pnpm check` passes. Conventional Commits.
4. Open the PR once `pnpm check`, the e2e run and the live check pass, with `.github/PULL_REQUEST_TEMPLATE.md`, `Closes #N` for each Task and a Conventional Commits title (it becomes the squash commit). The owner reviews and merges; then run the `after-merge` skill.
5. End of a session: leave a clean state. Everything committed; unfinished work pushed to a draft PR, never a half-done tree.

## Gotchas
- Commit by path: `git commit -- <paths>`. `git stash` is denied.
- `CLAUDE.md`, `.claude/`, `.github/`, `.husky/` and the root configs are read-only to sandboxed shell commands; edit them with the Edit or Write tool.
- `gh issue`, `gh pr`, `gh run` and `git push` have auth only as a standalone call outside the sandbox.
- Vitest has no content store: mock `astro:content` in specs and check real entries in Playwright on the built site. A running `astro dev` keeps its own store; restart it after a collection or branch change.
- Write temporary files in `$TMPDIR`; it is shared with other projects, so delete only your own files. Screenshots you need to look at go to `test-results/`, since the Read tool can't open `$TMPDIR`.
- Live check: each sandboxed command has its own localhost, and `astro preview` detaches and dies with the command. Start `ASTRO_PREVIEW_BACKGROUND=0 pnpm preview &` and the browser script in one command, then kill the server. A sandboxed server left running pins 0-byte placeholder files (`.bashrc`, `.git/config.lock`) in the tree.
- Staging deploys only when the owner starts a build (ADR 001). Before a staging check, ask the owner to build and wait until they say it is done; then confirm the staging home page links the same `/_astro/` assets as a local build of master (#296). `pnpm test:e2e:staging` runs as a standalone call outside the sandbox, where Node can resolve the staging host.
- `pnpm test:e2e:webkit` is excluded from the sandbox for Podman; run it as a standalone call, not chained after `pnpm build`.

## Writing
Docs, commits, PR bodies and chat: active voice, short sentences, no emojis, no em-dashes, no flattery. Avoid: delve, robust, seamless, synergy, tapestry, cutting-edge, leverage, furthermore, moreover, ultimately, in conclusion, unlocking. Name every issue or PR with a short description, for example "#357 (open photo too small at 400% zoom)", never a bare number. Be a critical sparring partner. Ask owner decisions with `AskUserQuestion`: your recommendation first, at least one alternative, and a no-op option with its cost. End a hand-back with an "Open items" list, owner actions first.
