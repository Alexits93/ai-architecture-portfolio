# 04 - App Architecture

## 1. Stack
- **Framework:** Astro (Static Site Generation mode).
- **Hosting:** Cloudflare Pages (Edge network, near-zero server attack surface).
- **Styling:** Pristine vanilla CSS/SCSS (migrated from legacy repo).
- **Content:** MDX / Markdoc for type-safe blog posts.
- **SEO/Social:** `Satori` for edge-generated Open Graph images (LinkedIn/Twitter).

## 2. Security First
- No Next.js, no Vercel, no Tailwind CSS.
- Statically generated output means no runtime server vulnerabilities (e.g., RCEs).
- CSP (Content Security Policy) headers must be extremely strict.
