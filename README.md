# pa-tech.dev

Personal portfolio and blog of Patrik Alexits. Static Astro site deployed to Cloudflare Pages.

## Stack
- Astro (`output: 'static'`), vanilla CSS, Markdown content collections
- Satori + resvg for Open Graph images
- Vitest (AstroContainer) for components, Playwright for user journeys
- ESLint with Feature-Sliced Design boundary rules

## Setup
Requires Node 26 and pnpm (version pinned in `package.json`).

```sh
pnpm install
pnpm dev        # http://localhost:4321
```

## Scripts
| Command | Purpose |
| --- | --- |
| `pnpm check` | Lint, `astro check`, unit tests with coverage |
| `pnpm test:e2e` | Playwright against `pnpm preview` (run `pnpm build` first) |
| `pnpm build` | Static build to `dist/` |

## Structure
```
src/
  pages/      routes (compositional only)
  widgets/    page sections (header, blog feed, ...)
  features/   user interactions (blog post filter)
  entities/   domain models (blog post)
  shared/     config, styles, UI kit, SEO and OG helpers
  content/    blog posts (Markdown)
e2e/          Playwright journeys
tests/        page-level and architecture tests
docs/         specs, execution plans, ADRs, architecture map
.claude/      Claude Code rules, hooks, skills, permissions
```

## Contributing
Conventional Commits, one branch per change, PRs follow `.github/PULL_REQUEST_TEMPLATE.md`. Rules for humans and agents: `CLAUDE.md` and `.claude/rules/`.
