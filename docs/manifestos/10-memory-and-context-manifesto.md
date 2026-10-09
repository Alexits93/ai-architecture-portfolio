# 10 - Memory & Context Manifesto (2026 Standards)

Based on industry standards for preventing LLM "context bloat" and "lost in the middle" degradation, this project enforces a **Tiered Memory Architecture** combined with a strict **Denylist Strategy**. 

We explicitly define what AI agents are **NOT** allowed to do regarding memory and context management.

## 1. The Memory Denylist (Strictly Forbidden Actions)

To prevent context poisoning and auto-memory bloats, the following actions are strictly banned for any AI agent interacting with this repository:

- **BANNED: Memory-Driven Framework Solutions.** Do not rely on LLM pre-training memory for framework-specific lifecycle APIs, transition behaviors, or integration mechanisms (e.g., Astro `ClientRouter` events, React hydration). Every framework API implementation MUST be backed by a current web search against official documentation to ensure accuracy and prevent deprecated or non-standard solutions.
- **BANNED: Chronological Log Files.** Do not create or append to files like `MEMORY.md`, `.claudememory`, or `session-logs.md`. Memory must be topic-based and stateful, not chronological.
- **BANNED: JSON Blobbing.** Never store raw JSON API responses, verbose terminal outputs, or full test execution traces in documentation or context files. Extract only the deterministic facts.
- **BANNED: Narrative Debugging.** Do not write conversational debugging steps into rules or manifestos (e.g., "We tried X and it failed with Y, so we did Z"). Write the final deterministic rule only (e.g., "Use configuration Z").
- **BANNED: Rule Duplication.** Do not duplicate rules across multiple files. `CLAUDE.md` maps the source of truth. If a rule belongs in testing, it goes in `02-testing-manifesto.md`. Nowhere else.
- **BANNED: Code Snippet Hoarding.** Do not copy-paste large blocks of implementation code into context files as "examples" unless absolutely critical for a highly complex pattern.

## 2. Active Context Compression

Memory must be compressed and updated, never merely appended.
- When updating a spec (`devspec.md`) or a manifesto, **overwrite and compress** outdated information.
- Once a task is completed, its associated scratch files or ephemeral logs must be discarded or ignored via `.gitignore`, not permanently indexed into the LLM context.

## 3. Tiered Memory Architecture

We organize context to protect the LLM context window:
1. **Critical/Immediate (Always in Context):** `CLAUDE.md` (Role, Anti-Slop, Denylists).
2. **Warm/Semantic (Loaded on Demand):** `/docs/manifestos/`. Loaded dynamically based on the specific domain (e.g., testing, security).
3. **Execution State (Ephemeral):** `docs/exec-plans/`. Once an execution plan is fully integrated and deployed, its detailed devspec is archived, not kept in the active hot-path of the agent's memory.

## 4. Enforcement
Agent hooks are nudges only. Reviewers reject PRs that add log files, JSON dumps, or narrative debugging to docs.
