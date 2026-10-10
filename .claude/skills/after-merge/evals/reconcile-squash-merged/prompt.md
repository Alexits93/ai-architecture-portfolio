---
description: After a squash merge with git and gh unusable in the run, the skill claims nothing and keeps unmerged work. The git steps themselves are checked with a headless claude -p run (see the Task issue), because plugin eval blocks git.
tags: [behavior]
max_turns: 30
timeout_seconds: 600
allowed_tools: [Skill, Read, Glob, Grep, Bash]
---

PR #7 (feat/done) is merged on GitHub. Reconcile this repo so my next session starts clean.
