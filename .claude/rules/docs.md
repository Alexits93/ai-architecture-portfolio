---
paths:
  - "docs/**"
  - "**/*.md"
---
# Specs and docs

Agents read these files as truth, so a stale or bloated doc causes wrong code later.

- A feature starts with `docs/exec-plans/<name>.spec.md` (requirements plus a mermaid `flowchart TD` of the DOM and state flow), then `<name>.devspec.md`: a behavioral matrix (input, state, expected output) with three sections: Security (XSS surface), Performance (LCP/CLS/INP strategy), FSD boundaries.
- Diagrams are mermaid only (`flowchart TD`, `sequenceDiagram`, `stateDiagram-v2`, `classDiagram`), never binary images.
- Update docs by overwriting and compressing. State the final rule ("use config Z"), not the story of how you got there.
- No session logs, raw JSON dumps, terminal traces or copied code blocks in docs.
- Tick items in `docs/exec-plans/modernization-and-security.plan.md` only after they merge to `master`.
- Banned words, emojis and em-dashes in Markdown are blocked by `.claude/hooks/anti-slop.mjs`.
