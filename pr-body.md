## Summary & Motivation
This PR refactors the remaining Astro pages (`cookie-disclaimer.astro`, `privacy-policy.astro`) to inherit `src/shared/styles/global.css` directly. It also removes a leftover inline fallback (`inherit`) for `var(--font-color)` in `Footer.astro`. This ensures complete adherence to the global CSS token system.

## Linked Tickets/Issues
Closes #2

## Testing Strategy
- Verified all 64/64 Vitest unit tests pass.
- Verified ESLint configuration rules pass cleanly.

## Pre-Merge Checklist
- [x] Tests passed
- [x] FSD / Architectural boundaries respected
- [x] No `any` / `unknown` introduced
- [x] Modernization mandated (used latest HTML5/CSS3/TS)
- [x] Documentation updated (DevSpecs, Specs, Architecture)

## Screenshots/Gifs
N/A
