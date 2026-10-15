const name = 'Patrik Alexits';
// One title for the whole site: the home and CV heroes and the home SEO title (#214).
const role = 'Frontend Architect';
// "front-end" keeps the hyphenated form on the home page next to the "Frontend" title (#125).
const pitch = 'In my roles I have designed front-end architecture, acted as lead engineer building systems, built harnesses for LLM coding agents and coached engineers, and I still do.';
const title = `${name} | ${role}`;
const description =
  'Frontend Architect Patrik Alexits designs front-end architecture, builds systems as lead engineer, builds harnesses for LLM coding agents and coaches engineers.';

/** Site-wide identity used by SEO metadata, the home and CV heroes, and generated OG images. */
export const SITE = {
  name,
  author: name,
  locale: 'en_GB',
  role,
  pitch,
  title,
  // Owner-approved copy within the 160 characters a search result shows; the hero keeps the full pitch (#307).
  description,
  // A pa-tech.dev alias, not a personal address, because the link is public and scraped (owner decision on #220).
  email: 'hello@pa-tech.dev',
  // The image every page except a post shares. It draws the title and the description, so its alt text repeats them (#305).
  defaultOgImage: { path: '/og.png', alt: `${title}. ${description}` },
} as const;

/** The owner's profiles: the /cv/ links and the `sameAs` of the Person structured data (#306). */
export const SOCIAL_LINKS = {
  github: 'https://github.com/Alexits93',
  linkedin: 'https://www.linkedin.com/in/patrik-alexits/',
  stackoverflow: 'https://stackoverflow.com/users/9327050/patrik-alexits',
  instagram: 'https://www.instagram.com/akelafreestyle/',
} as const;

/** The date the privacy policy shows and the sitemap gives as its lastmod (#307). */
export const PRIVACY_POLICY_UPDATED = new Date('2026-10-14');

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
