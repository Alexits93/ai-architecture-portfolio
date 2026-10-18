# pa-tech.dev

The code for [www.pa-tech.dev](https://www.pa-tech.dev), my portfolio, CV and blog. I'm Patrik Alexits, a frontend architect.

It's a static Astro site. Most pages ship no JavaScript; the theme toggle, the menu and the post transitions each have a small script.

## Run it

You need Node 26 and pnpm. The pnpm version is pinned in `package.json`.

```sh
pnpm install
pnpm dev
```

The dev server runs at http://localhost:4321.

## Scripts

| Command                | What it does                                          |
| ---------------------- | ----------------------------------------------------- |
| `pnpm dev`             | Dev server                                            |
| `pnpm check`           | Lint, `astro check` and unit tests                    |
| `pnpm build`           | Builds the site to `dist/`                            |
| `pnpm preview`         | Serves `dist/`                                        |
| `pnpm test:e2e`        | Playwright tests on the build. Run `pnpm build` first |
| `pnpm test:e2e:webkit` | WebKit tests in Podman                                |

## Stack

- Astro 7 and plain CSS
- Posts and CV data as Markdown and YAML in `src/content/`
- Open Graph images drawn at build time with Satori and resvg
- Vitest for components, Playwright and axe for pages in Chromium, Firefox and WebKit
- Hosted on [statichost.eu](https://www.statichost.eu/), which builds from this repo

The folders follow Astro's default layout. Files in `src/pages/` that start with `_` are page sections, not routes.

## Checks

Pull requests to `master` run lint, typecheck, unit tests, `pnpm audit` and the Playwright suite in all three engines. The PR title has to follow Conventional Commits. Locally, Husky runs ESLint, Prettier and commitlint before each commit.

## Deploys

I start each statichost.eu build by hand. A merge alone doesn't deploy. [ADR 001](docs/adrs/001-framework-migration.md) explains why.

## More docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how the theme, menu and page transitions work
- [docs/adrs/](docs/adrs/): decisions and their reasons
- [CLAUDE.md](CLAUDE.md) and `.claude/rules/`: the rules Claude Code follows in this repo
- [SECURITY.md](SECURITY.md): how to report a security issue
