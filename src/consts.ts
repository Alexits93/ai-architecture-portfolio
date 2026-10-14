const name = 'Patrik Alexits';
// One title for the whole site: the home and CV heroes and the home SEO title (#214).
const role = 'Frontend Architect';
// "front-end" keeps the hyphenated form on the home page next to the "Frontend" title (#125).
const pitch = 'I design front-end architecture, build harnesses for LLM coding agents, and coach engineers.';

/** Site-wide identity used by SEO metadata, the home and CV heroes, and generated OG images. */
export const SITE = {
  name,
  author: name,
  locale: 'en_US',
  role,
  pitch,
  title: `${name} | ${role}`,
  // Built from the role and pitch so search results and link previews match the heroes (#223).
  description: `${role}. ${pitch}`,
  // A pa-tech.dev alias, not a personal address, because the link is public and scraped (owner decision on #220).
  email: 'hello@pa-tech.dev',
  defaultOgImagePath: '/og.png',
} as const;

/** Satori output size. Open Graph and LinkedIn recommend 1200x630. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

/**
 * Internal routes. Every path ends with "/" to match `trailingSlash: 'always'` in astro.config.mjs.
 */
export const ROUTES = {
  home: '/',
  blog: '/blog/',
  cv: '/cv/',
  cookieDisclaimer: '/cookie-disclaimer/',
  privacyPolicy: '/privacy-policy/',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
