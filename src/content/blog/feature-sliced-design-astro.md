---
slug: feature-sliced-design-astro
title: "Feature-Sliced Design in Astro"
subtitle: "Layer boundaries for a static site that stays maintainable"
description: "Applying Feature-Sliced Design to an Astro project: where layouts, widgets, entities, and design tokens belong, and how to enforce the boundaries with lint rules."
publishDate: 2026-10-05
tags: ["Astro", "FSD", "Frontend Architecture"]
isFeatured: false
---

Astro gives you file-based routing and components. It does not tell you how to organize a growing codebase. Feature-Sliced Design fills that gap.

## The layers

- **app:** global styles, design tokens, layouts.
- **pages:** route composition only.
- **widgets:** self-contained page sections.
- **features:** user interactions.
- **entities:** business objects such as a blog post.
- **shared:** UI primitives and utilities with no business knowledge.

Imports only flow downward.

## Public APIs

Each slice exposes an `index.ts`. Deep imports into another slice's internals are a lint error.

## Styling belongs to the system

Components consume design tokens. They do not define colors, spacing, or type scales of their own.
