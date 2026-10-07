---
name: checkpoint-and-handover
description: >-
  Executes a rigorous 4-step protocol for pausing work, auditing context health, capturing session lessons, and generating a no-loss handover prompt for the next agent session. Use when the user asks to checkpoint, handover, or prepare for a new session.
---

# Checkpoint and Handover Protocol

This skill enforces a 4-step procedure designed to pause work, learn from the session without bloating the knowledge base, and prepare a deterministic handover prompt for a fresh agent session.

Follow these 4 steps in exact order when this skill is invoked:

## Step 1: Anti-Bloat Review (Current Diff)
- **Objective:** Apply the philosophy that "the best written code is the not written code."
- **Action:** Analyze the current uncommitted diff or recent changes. Ask yourself:
  - Did we introduce unnecessary packages, abstractions, or boilerplate?
  - Are there any overly complex workarounds that can be simplified?
- **Output:** Clean up any bloated code immediately if found, or note it for the handover if it requires user discussion.

## Step 2: Retrospect and Capture (Learning Lessons)
- **Objective:** Identify hiccups, reoccurring issues, or misalignments that happened in this session and persist them safely.
- **Action:** 
  - Review the session for repeated mistakes (e.g., struggling with a specific test framework, failing a specific linter rule repeatedly).
  - Update the appropriate LLM context file (e.g., `.cursor/rules/global.mdc`, `docs/manifestos/`, or a specific skill) with a concise, high-signal rule to prevent this in the future.
  - **Constraint (Non-Narrative Documentation):** Do NOT turn documents into a bloated notepad citing exact issues, debugging steps, or specific error messages you faced. Persist the lesson in a way that becomes a natural, informative part of the documentation (e.g., instead of "we got a NoMatchingRenderer error because jsdom...", write "Configure environment: 'node' to preserve compiler metadata").

## Step 3: Knowledge-Base Audit (Prevent Context Spiral)
- **Objective:** Ensure memory and LLM-specific files follow standards and do not cause a self-destructing spiral of AI context bloating and slopping.
- **Action:**
  - Quickly review the AI-facing documentation (`AI_INSTRUCTIONS.md`, `.cursor/rules/`, `docs/manifestos/`, `CLAUDE.md`).
  - Compress overly verbose explanations.
  - Ensure there are no contradictory rules or sycophantic language ("slop") bleeding into the docs.
  - Verify that architectural principles (like FSD, zero-trust typing) are deterministic and enforceable, not just aspirational text.

## Step 4: No-Loss Context Handover Prompt
- **Objective:** Generate a structured prompt for the user to copy-paste into the *next* agent session.
- **Action:** Output a final markdown block containing the exact prompt the user should use. 
- **The Prompt MUST Include:**
  1. **Current State (Git-Verified):** A hyper-concise summary of what was just achieved. You MUST base this strictly on `git log` / Git history to ensure the state is factual and grounded, not hallucinated.
  2. **Active Work:** What the very next step is, pointing to the specific `devspec.md` or component.
  3. **Strict Constraints Reminder:** A reminder of the most critical guardrails (e.g., OWASP, Web Vitals, TDD, zero `any`/`unknown`).
  4. **Self-Propagation Directive:** An explicit instruction for the *next* agent to acknowledge and bind itself to this `checkpoint-and-handover` skill, ensuring the no-loss mentality persists across all future sessions.

### Example Handover Prompt Format:
```markdown
**[HANDOVER PROTOCOL INITIATED]**
**State:** [Brief summary of codebase state]
**Next Step:** [Specific actionable next step]
**Directives for New Agent:**
1. Read the manifestos in `docs/manifestos/`.
2. Adhere to FSD, OWASP XSS prevention, and Web Vitals (LCP/INP/CLS) standards.
3. No `any`, no `unknown`. TDD is mandatory.
4. **SELF-PROPAGATION:** You must acknowledge and adhere to the `.agents/skills/checkpoint-and-handover/SKILL.md` skill. Before ending your session, you will be required to run this exact handover protocol.
```
