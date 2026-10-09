---
name: migrate-legacy
description: Migrate one component from the legacy web-components repo into this Astro codebase (analysis, spec, devspec, failing test, implementation).
argument-hint: "[component-name]"
disable-model-invocation: true
---
# Migrate a legacy component: $ARGUMENTS

Legacy source: `/home/patrika/Documents/projects/web-components/`. It is outside this repo; do not search the local git tree for it.

Assume the legacy code is outdated. Keep visual parity, but rewrite with current HTML, CSS and TypeScript instead of porting old patterns (custom-element lifecycle hacks, JS-toggled classes, shadow DOM workarounds).

## 1. Analyze (stop for approval)
1. Read the legacy component, its styles and every caller.
2. Write `docs/exec-plans/$ARGUMENTS-pathology.md`: a mermaid diagram of current entanglements (CSS coupling, hidden state, non-standard DOM manipulation) and a decoupling strategy.
3. Ask the user to approve before continuing.

## 2. Spec
- `docs/exec-plans/$ARGUMENTS.spec.md` and `$ARGUMENTS.devspec.md` following `.claude/rules/docs.md`.
- Decide the FSD layer and slice. Prefer native HTML state over scripts (`.claude/rules/astro-components.md`).

## 3. Test, then implement
1. Write failing Vitest tests from the devspec matrix; Playwright only for client-script behaviour.
2. Implement until `pnpm check` passes.
3. Update `docs/ARCHITECTURE.md`.
4. Delete the pathology file once the component merges; git history keeps it.
