## Summary & Motivation
Migrated the legacy `home` web-component layout to the Astro architecture, utilizing strict Feature-Sliced Design. Created layout composition with the `AboutMe` widget and introduced stub components for `BlogPostFeatured` and `BlogPostRecommended` widgets. Removed reliance on JavaScript for styling and interactivity in favor of pure HTML/CSS.

## Linked Tickets/Issues
Closes #19

## Testing Strategy
- Verified structural constraints using Astro Container via Vitest.
- E2E testing ensures DOM contains the layout wrapper and widgets.
- Linter checked for explicit types and lack of cross-boundary FSD imports.

## Pre-Merge Checklist
- [x] Tests passed
- [x] FSD / Architectural boundaries respected
- [x] No `any` / `unknown` introduced
- [x] Modernization mandated (used latest HTML5/CSS3/TS)
- [x] Documentation updated (DevSpecs, Specs, Architecture)

## Screenshots/Gifs
<!-- For UI-related changes, add a visual representation here. -->
