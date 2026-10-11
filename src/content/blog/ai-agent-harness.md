---
slug: ai-agent-harness
title: "Building an AI Agent Harness"
subtitle: "Deterministic gates around non-deterministic models"
description: "An LLM agent is only as reliable as the system around it. This post breaks down the parts of a harness: context, tools, gates, and handover."
publishDate: 2026-10-08
category: AI
isFeatured: true
---

A language model writes plausible code. Plausible is not correct. The harness is the part of the system that closes that gap.

## What a harness is

A harness is everything around the model that you control:

- **Context:** the rules, manifestos, and file excerpts the agent sees before it acts.
- **Tools:** the commands it can run, and the ones it cannot.
- **Gates:** linters, type checks, and tests that fail the build when the agent is wrong.
- **Handover:** a structured summary that lets the next session continue without guessing.

## Gates beat instructions

Telling an agent "never use `any`" works most of the time. A lint rule that fails CI works every time. If a rule matters, encode it as a check. Prose in a markdown file is a hint, not a guarantee.

## Live verification

An agent should never report a task as done based on what it wrote. It should report what it ran: the lint output, the test summary, the build result. Claims without command output are not evidence.

## Scope control

Agents degrade as scope grows. Small branches, one concern per pull request, and a hard checkpoint between phases keep quality stable.
