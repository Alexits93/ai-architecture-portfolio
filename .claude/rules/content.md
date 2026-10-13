---
paths:
  - "src/content/**"
  - "src/content.config.ts"
---
# Content collections (Astro 7)

- Collections are defined in `src/content.config.ts`: `glob()` for one Markdown file per entry, `file()` for one YAML file with an `id` per entry (`src/content/experience.yaml`). A legacy `config.ts` inside `src/content/` fails `tests/architecture/project-structure.spec.ts`.
- The glob loader uses the frontmatter `slug` as the entry `id`. Render an entry with `render(entry)` from `astro:content`.
- Run `pnpm astro sync` after any schema change, otherwise types infer as `never`.
- Blog posts are Markdown in `src/content/blog/`. The frontmatter `slug` must be lowercase kebab-case (schema-enforced).
