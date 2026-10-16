---
slug: architecture-rules-as-code
title: "Architecture Rules as Code"
subtitle: "If CI cannot fail on it, it is not a rule"
description: "Turn architecture principles into ESLint selectors, Stylelint rules, schema checks and tests, so violations break the build instead of slipping through review."
publishDate: 2026-10-06
category: Architecture
draft: true
---

Most architecture documents describe intent. Few of them are enforced. Over time the code drifts and the document becomes fiction.

## Pick the cheapest gate

- **Type system:** make invalid states unrepresentable.
- **Schema validation:** reject bad content at build time.
- **AST lint rules:** ban patterns with `no-restricted-syntax` selectors.
- **Tests:** assert structure that tools cannot express.

## Test the gate itself

A lint rule nobody tests can be disabled by accident. Lint a known-bad snippet in a unit test and assert the rule fires.

## Avoid placebo checks

A test that asserts `true` is worse than no test. It reports safety that does not exist.
