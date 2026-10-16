---
slug: get-started-with-coding-agents
title: "AI: Get Started with Coding Agents"
subtitle: "Practical guide for basics based on personal experience"
description: "Here is some practical advice I usually tell people new to Claude Code - or LLM tools in general."
publishDate: 2026-10-16
category: AI
---

Here is some practical advice I usually tell people new to Claude Code - or LLM tools in general.

## Use a session for one task only

Try to scope it small - the more the session's context window is filling up, the worse it will get and compaction ALWAYS loses context and information. Coding agents can give you information with `/context`. Don't be too nervous about hitting a seemingly big number, but make sure you are organizing your tasks in a session that they don't reach your context window's maximum.

## "What you are not allowed to do" works because the tool enforces it

Make sure to do proper research about standard deny and allowlists and set your `/permissions` properly to mitigate risks.

## AI coding tools follow instructions most of the time, but only hooks and tests are followed every time

Instruct your coding agents (Claude Code, Codex, Antigravity etc...) that as a "standing rule", identify recurring issues in sessions and create a deterministic gate in the form of a hook or a test in order to stop those happening and getting through.

## Don't accept "done" from your agent

Make it build, run, test and show output.

## It's important to use exact terminology

It avoids LLM misinterpretation. Their understanding of natural language makes this very shaky, so for example instead of describing a design pattern with your own words, you should simply name it. When LLMs use terms like "governing documentation", "standing rules" and so on, it's better if you use the same to make it understand your instructions better.

## Turn auto-memory feature off

This one is based on personal and professional experience. It pollutes, overloads and clutters all the base files and it's not self-maintaining, self-healing and it's impossible to maintain. Instruct your coding agent to analyze sessions and extract recurring tasks in skills - and do proper INTERNET research about how skills are standardized, tested and organized.

## The way models work changes

This is an important point. AI companies change this really frequently, so it's better to instruct your coding agents to do proper internet research before adjusting anything there, than setting a standard now which gets outdated soon and later the whole thing needs correction and maintenance.

## LLMs are very prone to ASSUME from memory and training data

Instruct them in case of recurring incorrect outputs to do internet research about tasks and questions where confidence is not high.

## Opus 5.5 on medium is enough

I use Claude Code, so this point is specific. Based on my professional experience, don't instruct for "deep research" and don't use "xhigh" or "ultracode" effort. Opus 5.5 on medium is enough - if it fails to give you your desired quality, go up to maximum "high".

## `/clear` when you didn't install a plugin

Use `/clear` when you didn't do something which needs a full restart. Exit and re-launch (full restart) when you installed something or your coding agents need to load something into every session.
