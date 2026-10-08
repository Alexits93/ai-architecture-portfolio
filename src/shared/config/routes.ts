/**
 * Single source of truth for internal routes.
 * Every path ends with "/" to match `trailingSlash: 'always'` in astro.config.mjs.
 * Components must import from here instead of hardcoding href strings (enforced by ESLint).
 */
export const ROUTES = {
  home: '/',
  blog: '/blog/',
  cv: '/cv/',
  cookieDisclaimer: '/cookie-disclaimer/',
  privacyPolicy: '/privacy-policy/',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
