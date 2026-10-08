# 01 - Documentation Manifesto & Anti-AI-Slop

## 1. The Anti-Slop Directive
LLMs naturally degrade into verbose, sycophantic text. This project actively bans:
- **Banned Vocabulary:** delve, robust, seamless, synergy, tapestry, cutting-edge, leverage, furthermore, moreover, ultimately, in conclusion, unlocking, dive into.
- **Banned Typography & Markers:** Emojis are strictly banned. Em-dashes (—) are strictly banned.
- **Banned Formatting:** Unnecessary adverbs, repetitive summary paragraphs, and flattery.

## 2. Spec-Driven Development (SDD)
Documentation is the single source of truth, not the code.
- Every feature starts with a `*.spec.md`.
- Specs translate to `*.devspec.md` (Behavioral Matrices) which map directly to tests.
- Documentation must be updated *before* code is changed during refactors.

## 3. Work Tracking (Epic -> Story -> Task)
All implementation work must be strictly documented and tracked via GitHub Issues following a hierarchical flow: **Epic** -> **Story** -> **Task/Subtask**. You must create these tracking issues and link them (e.g., `Closes #123`) in the PR description.
