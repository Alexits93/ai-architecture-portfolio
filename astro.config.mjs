// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { PRIVACY_POLICY_UPDATED, ROUTES } from './src/consts';
import { lastmodFor, readPostDates } from './src/lib/sitemap-lastmod';

const posts = readPostDates('./src/content/blog');

// https://astro.build/config
export default defineConfig({
  // Production origin. Required for absolute canonical and Open Graph URLs (Astro.site).
  site: 'https://www.pa-tech.dev',
  // Legacy permalinks were `/blog/:slug/`. One policy, enforced, preserves link equity.
  trailingSlash: 'always',
  // Inter from the local files the OG image also reads, served and preloaded by Astro
  // (https://docs.astro.build/en/guides/fonts/).
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Inter',
      cssVariable: '--font-inter',
      options: {
        variants: [
          { src: ['./src/assets/fonts/Inter-Regular.woff2'], weight: 400, style: 'normal' },
          { src: ['./src/assets/fonts/Inter-Bold.woff2'], weight: 700, style: 'normal' },
        ],
      },
    },
  ],
  integrations: [
    // The pre-paint theme script as an inline <head> script on every page, with no request.
    // Astro hashes head-inline scripts into script-src; e2e/csp.spec.ts fails if it stops doing so
    // (https://docs.astro.build/en/reference/integrations-reference/#injectscript-option).
    {
      name: 'theme-script',
      hooks: {
        'astro:config:setup': ({ injectScript }) =>
          injectScript('head-inline', readFileSync(new URL('./src/lib/theme.js', import.meta.url), 'utf-8')),
      },
    },
    // The card-to-post morph listens for pagereveal, which must be registered before the first render, so it is a
    // classic inline <head> script as well (https://developer.chrome.com/docs/web-platform/view-transitions/cross-document).
    {
      name: 'post-morph-script',
      hooks: {
        'astro:config:setup': ({ injectScript }) =>
          injectScript('head-inline', readFileSync(new URL('./src/lib/post-morph.js', import.meta.url), 'utf-8')),
      },
    },
    // Sitemap from every built route; the site uses none of the optional namespaces
    // (https://docs.astro.build/en/guides/integrations-guide/sitemap/). serialize adds lastmod from content dates
    // (https://docs.astro.build/en/guides/integrations-guide/sitemap/#serialize). filter leaves out
    // the noindex draft posts (https://docs.astro.build/en/guides/integrations-guide/sitemap/#filter).
    sitemap({
      namespaces: { news: false, xhtml: false, image: false, video: false },
      filter: (page) => !posts.some((post) => post.draft && new URL(page).pathname === `/blog/${post.id}/`),
      serialize: (item) => {
        const lastmod = lastmodFor(new URL(item.url).pathname, posts, { [ROUTES.privacyPolicy]: PRIVACY_POLICY_UPDATED });
        return lastmod === undefined ? item : { ...item, lastmod: lastmod.toISOString() };
      },
    }),
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
        // No upgrade-insecure-requests: WebKit applies it to http://localhost and breaks local e2e. Production
        // does not need it: HSTS in public/_headers, and e2e/csp.spec.ts bans http:// subresources.
      ],
    },
  },
});
