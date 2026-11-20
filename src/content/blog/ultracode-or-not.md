---
slug: ultracode-or-not
title: "AI: Ultracode or Not to Ultracode?"
subtitle: "When a team of agents beats one, and when it doesn't"
description: "I asked Claude Code one question with ultracode on, and it used 9 agents to answer it."
publishDate: 2026-11-11
category: AI
---

I asked Claude Code one question this week with ultracode on, and noticed that it used 9 agents to answer it.

5 minutes and about 635k tokens. The answer was good, but I had this weird feeling of an overcomplicated answer, with too much context to hold.

## What's actually been measured

So I checked what's actually been measured.

Anthropic's own multi-agent research setup beat a single agent by 90.2%. It also used roughly 15x the tokens of a normal chat. And Anthropic says that most coding work doesn't split up as efficiently as research does.

Google Research has reported similar results. A task that breaks into independent pieces got 80.8% better. Sequential planning got 70% worse.

There is also a small study on 133 LeetCode problems. One agent scored 98.50%. The multi-agent setup scored 97.74%, and took about 4x longer.

## Where I draw the line

A team of agents pays off for big audits, migrations and reviews, where a fresh agent checks what another one built. A "fresh pair of eyes", similar to the [Elephant-Goldfish Model](/blog/elephant-goldfish-model) I already wrote about. Handing the same task to another agent and hoping for a better answer doesn't give better results.

For everyday coding? Off it goes.

Where do you draw the line? What's one task you'd always hand to a team of agents, and one you'd never?

## Sources

- [Orchestrate subagents at scale with dynamic workflows](https://code.claude.com/docs/en/workflows), Claude Code docs (what ultracode turns on)
- [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), Anthropic Engineering (source of the 90.2%, the 15x tokens and the note on coding work)
- [Towards a Science of Scaling Agent Systems](https://arxiv.org/abs/2512.08296), Kim et al., Google Research (source of the +80.8% on decomposable financial reasoning and the -70% on sequential planning)
- [Single-Agent versus Multi-Agent LLM Systems for Automated Programming](https://liang-y-yu.github.io/publication/2025-10-01-paper-title-number-10), Yu, Alégroth, Chatzipetrou and Gorschek (source of the 133 LeetCode problems)
- [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices), Claude Code docs (a reviewer that hasn't seen how the code was written)
