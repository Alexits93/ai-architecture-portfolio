/** Site-wide identity used by SEO metadata and generated OG images. */
export const SITE = {
  name: 'Patrik Alexits',
  author: 'Patrik Alexits',
  locale: 'en_US',
  title: 'Patrik Alexits | Frontend Architect',
  description: 'Software engineer and architect. I build harnesses for LLM coding agents, and coach and mentor engineers.',
  defaultOgImagePath: '/og.png',
} as const;

/** Satori output size. Open Graph and LinkedIn recommend 1200x630. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;
