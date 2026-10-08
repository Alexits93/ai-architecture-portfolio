## Summary & Motivation
Migrated the legacy `blog-post-filter` web component to a native Astro component adhering to the Feature-Sliced Design (FSD) architecture (`src/features/blog-post-filter`). The new component wraps `SkillTag` elements in a custom `<blog-post-filter>` element to handle interactivity (toggling tags and dispatching `filter-tag-selected` custom events) completely independent of legacy dependencies.

## Linked Tickets/Issues
Closes #16

## Testing Strategy
- Verified initial render using `experimental_AstroContainer` and `JSDOM`.
- Validated empty props, populated tags, and `data-selected` logic.
- Maintained 100% test coverage threshold.

## Pre-Merge Checklist
- [x] Tests passed
- [x] FSD / Architectural boundaries respected
- [x] No `any` / `unknown` introduced
- [x] Modernization mandated (used latest HTML5/CSS3/TS)
- [x] Documentation updated (DevSpecs, Specs, Architecture)

## Screenshots/Gifs
N/A
