## Summary & Motivation
Implemented the internal logic for the `BlogPostFeatured` and `BlogPostRecommended` widgets on the home page. This includes setting up the Astro content layer for blog posts, creating the `BlogPostThumbnail` entity, and correctly resolving data dependencies for featured and recommended posts natively via `astro:content`.

## Linked Tickets/Issues
Closes #1

## Testing Strategy
- Utilized `astro/container` and `jsdom` to write unit tests for the newly created `BlogPostThumbnail` component.
- Updated `BlogPostFeatured` and `BlogPostRecommended` test suites to mock `astro:content`.
- Ensured 100% test coverage including fallback behaviors.

## Pre-Merge Checklist
- [x] Tests passed
- [x] FSD / Architectural boundaries respected
- [x] No `any` / `unknown` introduced
- [x] Modernization mandated (used latest HTML5/CSS3/TS)
- [x] Documentation updated (DevSpecs, Specs, Architecture)

## Screenshots/Gifs
N/A
