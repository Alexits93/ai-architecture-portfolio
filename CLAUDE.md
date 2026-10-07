# Claude Instructions

This project enforces strict Spec-Driven Development, TDD, and Anti-AI-Slop guidelines.

**Required Reading:**
1. Read `AI_INSTRUCTIONS.md` immediately for the core rules and banned words.
2. Read the manifestos in `/docs/manifestos/` for specific architecture, tooling, and testing constraints before making structural changes.

**Memory & Context Enforcement (Strict Denylist):**
- **BANNED:** Do NOT create `.claudememory`, `MEMORY.md`, or chronologically appended log files. 
- **BANNED:** Do NOT write raw JSON API dumps, long terminal traces, or narrative debugging steps to any file.
- **Rule:** Memory must be topic-based, stateful, and actively compressed (overwrite, do not append). Refer to `10-memory-and-context-manifesto.md` for full enforcement details.
