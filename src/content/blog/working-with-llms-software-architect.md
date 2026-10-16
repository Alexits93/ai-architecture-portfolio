---
slug: working-with-llms-software-architect
title: "Working with LLMs as a Software Architect"
subtitle: "Treat the model as a fast junior engineer with no memory"
description: "Practical habits for pairing with LLMs on real codebases: scoping tasks, feeding context, challenging output, and keeping ownership of design decisions."
publishDate: 2026-10-07
category: AI
draft: true
---

LLMs are good at producing code quickly. They are bad at knowing when that code is wrong. The architect's job does not go away. It moves.

## Scope the task, not the prompt

A precise prompt for a vague task still produces vague output. Break work into units small enough to review in one sitting.

## Context is a budget

Every token of context competes for attention. Give the model the contract it must satisfy, not the whole repository.

## Ask for disagreement

A model tuned to be helpful will agree with you. Ask it to argue against your design before it implements it.

## Own the decisions

The model can propose. You decide. Record decisions in ADRs so the next session, human or model, does not relitigate them.
