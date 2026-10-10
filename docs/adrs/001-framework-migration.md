# ADR 001: Framework Migration (Next.js/Vercel -> Astro, static hosting)

## Context
The previous iteration of this portfolio relied on Next.js, Vercel, and Tailwind. In recent years, Next.js has suffered from RCE vulnerabilities, Vercel has faced supply-chain concerns, and the Tailwind team has shrunk significantly.

## Decision
Migrate to **Astro** with `output: 'static'`: pure static HTML, hosted on **statichost.eu** (Hobby plan, `www.pa-tech.dev` canonical, 301 from the apex). Security headers live in `public/_headers`.

## Consequences
- **Positive:** Near-zero attack surface.
- **Positive:** Perfect Lighthouse scores and SEO for the AI blog.
- **Positive:** Absolute control over pristine vanilla CSS without utility-class bloat.
- **Negative:** Loss of Vercel's out-of-the-box dynamic OG image generation (mitigated by implementing `Satori` in Astro).
