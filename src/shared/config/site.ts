const name = 'Patrik Alexits';
// One title for the whole site: the home and CV heroes and the home SEO title (#214).
const role = 'Frontend Architect';

/** Site-wide identity used by SEO metadata, the home and CV heroes, and generated OG images. */
export const SITE = {
  name,
  author: name,
  locale: 'en_US',
  role,
  // "front-end" keeps the hyphenated form on the home page next to the "Frontend" title (#125).
  pitch: 'I design front-end architecture, build harnesses for LLM coding agents, and coach engineers.',
  title: `${name} | ${role}`,
  description: 'Software engineer and architect. I build harnesses for LLM coding agents, and coach and mentor engineers.',
  defaultOgImagePath: '/og.png',
} as const;

/** Satori output size. Open Graph and LinkedIn recommend 1200x630. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;
