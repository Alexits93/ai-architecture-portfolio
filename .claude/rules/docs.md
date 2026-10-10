---
paths:
  - "docs/**"
  - "**/*.md"
---
# Specs and docs

Agents read these files as truth, so a stale or bloated doc causes wrong code later.

- Plans, specs and devspecs live in GitHub issues, never in the repo. The Task issue holds the spec under "Description" (requirements plus a mermaid `flowchart TD` of the DOM and state flow) and the devspec under "Requirements / Constraints": a behavioral matrix (input, state, expected output) with Security (XSS surface), Performance (LCP/CLS/INP strategy) and FSD boundaries. `tests/architecture/plans-in-issues.spec.ts` fails on plan, spec or devspec Markdown files.
- The repo keeps only durable docs: `docs/ARCHITECTURE.md` (what is) and `docs/adrs/` (why).
- Diagrams are mermaid only (`flowchart TD`, `sequenceDiagram`, `stateDiagram-v2`, `classDiagram`), never binary images.
- Update docs by overwriting and compressing. State the final rule ("use config Z"), not the story of how you got there.
- No session logs, raw JSON dumps, terminal traces or copied code blocks in docs.
- Banned words, emojis and em-dashes in Markdown are blocked by `.claude/hooks/anti-slop.mjs`.
