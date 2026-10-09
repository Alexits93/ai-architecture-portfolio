---
paths:
  - "src/content/**"
  - "src/content.config.ts"
---
# Content collections (Astro 7)

- Collections are defined in `src/content.config.ts` with the `glob()` loader. A legacy `config.ts` inside `src/content/` fails `tests/architecture/project-structure.spec.ts`.
- `CollectionEntry` has `id` and `rendered`; `slug` and `render()` no longer exist.
- Run `pnpm astro sync` after any schema change, otherwise types infer as `never`.
- Blog posts are Markdown in `src/content/blog/`. The frontmatter `slug` must be lowercase kebab-case (schema-enforced).
