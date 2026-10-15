import { SITE, SOCIAL_LINKS } from '@/consts';

export type JsonLdValue = string | number | boolean | null | JsonLdValue[] | JsonLdObject;
export interface JsonLdObject {
  [key: string]: JsonLdValue;
}

/**
 * Serializes structured data for a `<script type="application/ld+json">` block.
 * JSON.stringify does not escape "<", so a value containing "</script>" would break out
 * of the script element (OWASP XSS). Escaping "<" as \u003c keeps the JSON valid and inert.
 */
export const serializeJsonLd = (data: JsonLdObject): string =>
  JSON.stringify(data).replace(/</g, '\\u003c');

/** The site owner, identified by `@id` so the home graph and /cv/ name the same Person (#306). */
export const personJsonLd = (homeUrl: string): JsonLdObject => ({
  '@type': 'Person',
  '@id': `${homeUrl}#person`,
  name: SITE.name,
  jobTitle: SITE.role,
  description: SITE.description,
  url: homeUrl,
  sameAs: Object.values(SOCIAL_LINKS),
});

/** Home: the WebSite and its author (https://schema.org/WebSite). */
export const homeJsonLd = (homeUrl: string): JsonLdObject => ({
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', '@id': `${homeUrl}#website`, name: SITE.name, url: homeUrl, author: { '@id': `${homeUrl}#person` } },
    personJsonLd(homeUrl),
  ],
});

/** /cv/: Google requires a Person as mainEntity (https://developers.google.com/search/docs/appearance/structured-data/profile-page). */
export const profilePageJsonLd = (homeUrl: string): JsonLdObject => ({
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  mainEntity: personJsonLd(homeUrl),
});
