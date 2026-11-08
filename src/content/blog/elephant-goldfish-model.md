---
slug: elephant-goldfish-model
title: "AI: Design Like an Elephant, Review Like a Goldfish"
subtitle: "Why the agent that knows your project best is the worst one to review it"
description: "Your AI agent remembers too much to check its own work."
publishDate: 2026-11-06
category: AI
---

Your AI agent remembers too much to check its own work.

Google just open-sourced the method thousands of its engineers say they use every day to ship production code. It's called the Elephant-Goldfish Model, and the idea is simple: the AI that knows your project best is the worst one to review it.

The Elephant is a long-running session that holds your context, your decisions and the overall design.

The Goldfish is a fresh session with no memory. It sees only the written spec, so it spots the assumptions the Elephant never wrote down.

## 8 conventions you can use today

You don't need the plugin to try this. Here are 8 conventions you can use in any AI setup today:

1. **Design before code.** Use the Elephant session only for design. Let it interview you and push back on your choices before anyone writes a line.
2. **Make the document the handoff.** Save the agreed direction to a file, like a brief or a design draft. Anything that isn't written down doesn't exist for the reviewer, and that's the point.
3. **Draft one section at a time.** Ask the AI to pause after each section for your feedback instead of producing the whole thing at once.
4. **Fresh means really fresh.** Your reviewer should be a brand-new chat or subagent that gets only the spec and the source files it references. No chat history.
5. **Review in several passes.** Check clarity, fit with the existing code and the implementation plan as separate passes.
6. **You own the trade-offs.** The AI suggests, but the decision is yours. Choose which review findings are valid and approve the design before any code is written.
7. **A review isn't a test.** It finds gaps only and it doesn't prove the code works, so keep your tests and it's important to base the decisions on your own judgement.
8. **Match the process to the task.** Use it for features that need real decisions, creative or unconventional solutions, flexibility - not for small, obvious fixes.

## The short version

Remember like an elephant when you design, and forget like a goldfish when you review.

Which one does your workflow lack more, the Elephant or the Goldfish?

## Sources

- [google/elephant-goldfish-model](https://github.com/google/elephant-goldfish-model), the open source plugin on GitHub
- [Google open sources its Elephant-Goldfish Model plugin for AI coding](https://betanews.com/article/google-open-sources-its-elephant-goldfish-model-plugin-for-ai-coding/), BetaNews (source of the daily use by thousands of Googlers)
- [Elephant-Goldfish Model (EGM) Plugin: Installation in Claude Code and Codex, Workflow, and Use Cases](https://smartscope.blog/en/blog/elephant-goldfish-model-egm-plugin-installation-claude-code-2026/), SmartScope
