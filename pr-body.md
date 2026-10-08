## Summary & Motivation
Resolves critical UI/UX regressions including layout scatter, ViewTransitions routing crashes, and the dark-mode flash. Adds scroll-lock for the mobile menu and integrates robust accessibility (A11y) fallbacks for the CSS-only menu toggle. Updates the Memory and Context manifesto to enforce Memory-Driven Framework Solutions (banning implicit framework assumptions and mandating `search_web` for APIs).

## Linked Tickets/Issues
Closes #1

## Testing Strategy
Manually verified routing with ViewTransitions. Confirmed dark-mode flashes are resolved by theme initialization changes. Verified CSS-only menu fallback interaction on mobile. 

## Pre-Merge Checklist
- [x] Tests passed
- [x] FSD / Architectural boundaries respected
- [x] No `any` / `unknown` introduced
- [x] Modernization mandated (used latest HTML5/CSS3/TS)
- [x] Documentation updated (DevSpecs, Specs, Architecture)

## Unverified Risks & Metacognition
- The CSS-only mobile menu relies on the `body:has()` selector, which might have patchy support on very old browsers, though A11y JS fallbacks mitigate interaction issues.

## Screenshots/Gifs
N/A
