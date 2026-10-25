---
slug: who-is-the-harness
title: "AI: Who Is the Harness?"
subtitle: "How one correction sent me back to the outer harness"
description: "I'm a big fan of clear terminology. A sharp correction about the term AI harness reminded me where the outer harness comes from."
publishDate: 2026-10-25
category: AI
---

I'm a big fan of clear terminology. I require it at work too, and encourage the people I coach and mentor to embrace it.

I love how AI/LLMs expose this communication gap clearly present in everyday engineering - describing a pattern or principle, leaving room for misinterpretation and then comes the "that's not what I meant".

Last week I had a talk with Darryn Crawford at the Volaris Group London AI accelerator where we both were present as coaches and I remember using the term "AI harness" to describe the setup I'm building at our company.

He sharply corrected me as "Claude Code is the harness", which made me think that I've been referring to our "user harness" or "outer harness" the same way as the people I'm trying to influence not to use vague terms to describe principles or patterns.

Ever since, I had been trying to recall where the "outer harness" phrase is coming from, since this term and the meaning has been influencing how I approached building our AI/LLM setup.

I finally found it: [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html).

Birgitta Böckeler used the term "outer harness" describing three layers essentially defining it:

- The model
- The coding agent's builder harness (like Claude Code)
- The user harness, "the outermost ring" which is what a team builds for its own systems.

This small interaction started an avalanche in my mind as one of my main principles - using clear terminology - I failed to apply and his sharp response reminded me of my early research, which I went back to and studied again.

## Sources

- [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html), Birgitta Böckeler on martinfowler.com
- [Building agents with the Claude Agent SDK](https://claude.com/resources/articles/building-agents-with-the-claude-agent-sdk), Anthropic
- [Harnesses Explained: The Inner and Outer Workings of the Coding Agent Harness](https://codagent.beehiiv.com/p/harnesses-explained)
- [Inner vs Outer Agent Harness](https://gonimbus.ai/blog/inner-vs-outer-agent-harness/), Nimbus
- [The Outer Harness: Why the Real Work in AI Coding Agents Isn't the LLM](https://codeongrass.com/blog/outer-harness-real-work-ai-coding-agents/)
- [What Is Harness Engineering AI? The Definitive 2026 Guide](https://atlan.com/know/what-is-harness-engineering/), Atlan
