## Summary & Motivation
Migrates the legacy `cv-page` Hybrids.js web component to a modern Astro FSD architecture. Extracts hardcoded template CSS into Astro scoped styles, composes existing `AboutMe` and `SkillTag` components, and establishes a zero-JS static page route for the CV.

## Linked Tickets/Issues
Closes #23

## Testing Strategy
- Added Playwright E2E test `e2e/cv.spec.ts` asserting component composition, layout classes, and the PDF download link functionality.
- Fixed `index.spec.ts` test placement and linting errors to maintain 100% CI compliance.

## Pre-Merge Checklist
- [x] Tests passed
- [x] FSD / Architectural boundaries respected
- [x] No `any` / `unknown` introduced
- [x] Modernization mandated (used latest HTML5/CSS3/TS)
- [x] Documentation updated (DevSpecs, Specs, Architecture)

## Screenshots/Gifs
N/A
