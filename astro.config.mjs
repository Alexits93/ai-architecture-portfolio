// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

// https://astro.build/config
export default defineConfig({
  // Production origin. Required for absolute canonical and Open Graph URLs (Astro.site).
  site: 'https://www.pa-tech.dev',
  // Legacy permalinks were `/blog/:slug/`. One policy, enforced, preserves link equity.
  trailingSlash: 'always',
  integrations: [
    // The pre-paint theme script as an inline <head> script on every page, with no request (#86).
    // Astro hashes head-inline scripts into script-src; e2e/csp.spec.ts fails if it stops doing so
    // (https://docs.astro.build/en/reference/integrations-reference/#injectscript-option).
    {
      name: 'theme-script',
      hooks: {
        'astro:config:setup': ({ injectScript }) =>
          injectScript('head-inline', readFileSync(new URL('./src/lib/theme.js', import.meta.url), 'utf-8')),
      },
    },
    // Sitemap from every built route; the site uses none of the optional namespaces
    // (https://docs.astro.build/en/guides/integrations-guide/sitemap/).
    sitemap({ namespaces: { news: false, xhtml: false, image: false, video: false } }),
  ],
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
        // No page submits a form; form-action has no default-src fallback (MDN CSP form-action).
        "form-action 'none'",
        "require-trusted-types-for 'script'",
        'upgrade-insecure-requests',
      ],
    },
  },
});
