# pa-tech.dev

Personal portfolio and blog of Patrik Alexits. Static Astro site hosted on statichost.eu.

## Stack

- Astro (`output: 'static'`), vanilla CSS, Markdown and YAML content collections
- Satori + resvg for the Open Graph image
- Vitest (AstroContainer) for components, Playwright for pages in Chromium, Firefox and WebKit

## Setup

Requires Node 26 and pnpm (version pinned in `package.json`).

```sh
pnpm install
pnpm dev        # http://localhost:4321
```

## Scripts

| Command         | Purpose                                                    |
| --------------- | ---------------------------------------------------------- |
| `pnpm check`    | Lint, `astro check`, unit tests                            |
| `pnpm build`    | Static build to `dist/`                                    |
| `pnpm test:e2e` | Playwright against `pnpm preview` (run `pnpm build` first) |

## Docs

`docs/ARCHITECTURE.md` (runtime behavior) and `docs/adrs/` (decisions). Agent instructions: `CLAUDE.md` and `.claude/rules/`.
