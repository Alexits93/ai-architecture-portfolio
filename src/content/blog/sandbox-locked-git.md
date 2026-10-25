---
slug: sandbox-locked-git
title: "AI: Locked Down So Well That Git Stopped Working"
subtitle: "What sandboxing a coding agent taught me about side effects"
description: "I locked down my AI coding agent so well that git stopped working."
publishDate: 2026-10-25
category: AI
---

I locked down my AI coding agent so well that git stopped working.

Claude Code can run its shell commands in a sandbox. Your OS decides which folders it can write to and which sites it can reach. Inside that box, it doesn't need to ask permission for every command. Anthropic says this cut their own permission prompts by 84%.

I also locked my lint configs and tests, so the agent can't weaken its own quality checks.

Then `git switch` started failing halfway. Some files changed, the locked ones didn't. And `git stash` also couldn't put the locked files back.

My first fix made me approve every retry by hand. It was safe, but I turned into the bottleneck.

## What works now

- A small hook blocks those git commands inside the sandbox, before they can half-finish.
- The same command can run outside the sandbox, and a separate AI reviewer checks it first, not me.
- `git stash` is denied, and a test keeps it that way.

## What I learned

A sandbox isn't something you switch on and forget. Each lock has side effects. Write down which ones you hit, then turn each one into a test or a hook so it can't come back.

## Sources

- [Sandboxing](https://code.claude.com/docs/en/sandboxing), Claude Code docs
- [Beyond permission prompts: making Claude Code more secure and autonomous](https://www.anthropic.com/engineering/claude-code-sandboxing), Anthropic Engineering (source of the 84% figure)
- [sandbox-runtime](https://github.com/anthropics/sandbox-runtime), the open source sandbox runtime
