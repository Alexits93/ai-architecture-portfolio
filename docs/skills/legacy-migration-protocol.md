# Skill: Legacy Migration Protocol

This is a standardized workflow protocol for Claude, Cursor, and Codex to safely migrate the legacy `web-components` codebase into the new Astro architecture.

## Phase 0: Reverse-Engineering & Pathology (Zero Assumptions)
Never assume a 1:1 migration is safe. Legacy components are often highly niche, non-standard, and entangled (e.g., custom shadow DOM lifecycle hacks, side-effect heavy). 
1. **Analyze:** Read the legacy code thoroughly.
2. **De-entanglement Report:** Generate a Mermaid.js diagram documenting the *current entanglements* (CSS coupling, hidden state mutations, non-standard DOM manipulation).
3. **Decoupling Strategy:** Propose how to extract the presentation (CSS) from the non-standard logic before writing the spec.

## Execution Loop (Strict Sequence)
Once Phase 0 is approved, execute this loop:

1. **Information Gathering:**
   - Review the decoupled CSS/HTML requirements.
2. **Documentation & Visualization (Living Documentation):**
   - Create a `[component-name].spec.md` in `docs/exec-plans/`.
   - Embed a `mermaid` diagram mapping the *new* Astro DOM tree and state flow.
3. **Behavioral Matrix (DevSpec):**
   - Create the `[component-name].devspec.md`.
4. **Test-Driven Implementation:**
   - Write a failing Vitest/Playwright test.
   - Implement the Astro component.
5. **Living Documentation Sync:**
   - Update `docs/ARCHITECTURE.md` to reflect the repository visualization.
