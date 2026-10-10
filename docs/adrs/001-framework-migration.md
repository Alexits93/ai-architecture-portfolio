# ADR 001: Framework Migration (web components -> Astro, static hosting)

## Context
The legacy site was a web-components repo: every component was a custom element with its own script and styles, meant to ship as a separate package.

## Decision
Migrate to **Astro** with `output: 'static'`: pure static HTML, hosted on **statichost.eu** (Hobby plan, `www.pa-tech.dev` canonical, 301 from the apex). Security headers live in `public/_headers`. The code follows Astro's conventions, not the legacy component breakdown (ADR 002).

## Consequences
- **Positive:** Near-zero attack surface.
- **Positive:** Server-rendered HTML with zero JavaScript by default, so good Lighthouse and SEO results for the blog.
- **Positive:** Full control over vanilla CSS without utility-class bloat.
- **Negative:** Open Graph images need a build step (`Satori` in Astro).
