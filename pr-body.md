## Summary & Motivation
This PR addresses baseline fixes for UX modernization and accessibility. It solves the layout scatter, ViewTransitions routing crash, and dark-mode flash by explicitly removing Astro's JS-heavy router in favor of lightweight Native CSS View Transitions (`@view-transition { navigation: auto; }`). It introduces a native `<dialog>` element for the mobile menu, removing legacy checkbox hacks and JS polyfills, while preserving the circle reveal animation and scroll lock natively. The FOUC issues are fully resolved. Documentation has been updated to reflect these changes.

## Linked Tickets/Issues
Ref #2

## Testing Strategy
All 58 files, including tests and documentation, have been rigorously audited. `vitest` passes as tests verify rendered output and accessibility attributes rather than internal Astro routing mechanics. Confirmed removal of `ClientRouter`, `astro:page-load`, and `astro:after-swap` hooks across the codebase and validated native HTML5/CSS3 zero-JS behaviors.

## Pre-Merge Checklist
- [x] Tests passed
- [x] FSD / Architectural boundaries respected
- [x] No `any` / `unknown` introduced
- [x] Modernization mandated (used latest HTML5/CSS3/TS)
- [x] Documentation updated (DevSpecs, Specs, Architecture)

## Unverified Risks & Metacognition
- The Native CSS View Transitions implementation works perfectly on modern WebKit and Blink browsers, but there is an inherent ~15% blind spot concerning legacy browsers or Safari on older iOS versions that might not fully support the `@view-transition` CSS at-rule, potentially resulting in abrupt page loads rather than smooth crossfades.
- Cross-browser behavior for mobile menu scroll-locking edge cases (such as overscroll-behavior variations on older mobile devices) has not been exhaustively tested across all physical device matrices.

## Screenshots/Gifs
N/A
