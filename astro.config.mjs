// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Production origin. Required for absolute canonical and Open Graph URLs (Astro.site).
  site: 'https://www.pa-tech.dev',
  // Legacy permalinks were `/blog/:slug/`. One policy, enforced, preserves link equity.
  trailingSlash: 'always',
  // Shiki writes inline style attributes, which the hashed style-src blocks. Prism emits classes only;
  // BlogPostReader styles the token classes (https://docs.astro.build/en/reference/configuration-reference/#securitycsp).
  markdown: {
    syntaxHighlight: 'prism',
  },
  // Hash-based CSP emitted as a <meta> tag per page (https://docs.astro.build/en/reference/configuration-reference/#securitycsp).
  // frame-ancestors is ignored in <meta>, so it lives in public/_headers.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
        "require-trusted-types-for 'script'",
        'upgrade-insecure-requests',
      ],
    },
  },
});
