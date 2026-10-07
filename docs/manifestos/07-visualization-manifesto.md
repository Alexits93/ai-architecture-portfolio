# 07 - Living Documentation & Visualization

## 1. The Living Documentation Principle
Documentation must not be static text. It must be a machine-readable, source-linked extension of the codebase. When the code changes, the visualization must change in the same PR.

## 2. Diagrams-as-Code (Mermaid.js)
To ensure AI models (Claude, Codex) can read, generate, and edit visual architecture, we strictly use **Mermaid.js**.
- Binary images (PNG, Draw.io native formats) are banned for architectural maps.
- Permitted diagrams: `flowchart TD`, `sequenceDiagram`, `stateDiagram-v2`, `classDiagram`.

## 3. Mandatory Visualizations
- **Component Level:** Every `.spec.md` must contain a Mermaid flowchart mapping the DOM structure and state flow.
- **System Level:** The root `ARCHITECTURE.md` must contain a global map of the Astro routing, Cloudflare edge functions, and data flow. This must be updated continually.
