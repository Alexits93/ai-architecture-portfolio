import { describe, it, expect } from 'vitest';
import { SITE, SOCIAL_LINKS } from '@/consts';
import { homeJsonLd, personJsonLd, profilePageJsonLd, serializeJsonLd } from './json-ld';

describe('serializeJsonLd', () => {
  it('produces valid JSON that round-trips', () => {
    const data = { '@type': 'BlogPosting', headline: 'Hello', wordCount: 3, draft: false, author: null };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });

  it('escapes "<" so a value cannot close the script element', () => {
    const output = serializeJsonLd({ headline: '</script><script>alert(1)</script>' });
    expect(output).not.toContain('<');
    expect(JSON.parse(output).headline).toBe('</script><script>alert(1)</script>');
  });
});

// Home and /cv/ describe the site owner (https://developers.google.com/search/docs/appearance/structured-data/profile-page).
describe('personJsonLd', () => {
  it('names the owner, the role and the social profiles', () => {
    expect(personJsonLd('https://www.pa-tech.dev/')).toEqual({
      '@type': 'Person',
      '@id': 'https://www.pa-tech.dev/#person',
      name: SITE.name,
      jobTitle: SITE.role,
      description: SITE.description,
      url: 'https://www.pa-tech.dev/',
      sameAs: Object.values(SOCIAL_LINKS),
    });
  });
});

describe('homeJsonLd', () => {
  it('describes the site as a WebSite by the Person', () => {
    expect(homeJsonLd('https://www.pa-tech.dev/')).toEqual({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': 'https://www.pa-tech.dev/#website',
          name: SITE.name,
          url: 'https://www.pa-tech.dev/',
          author: { '@id': 'https://www.pa-tech.dev/#person' },
        },
        personJsonLd('https://www.pa-tech.dev/'),
      ],
    });
  });
});

describe('profilePageJsonLd', () => {
  it('makes the Person the main entity of the page', () => {
    expect(profilePageJsonLd('https://www.pa-tech.dev/')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      mainEntity: personJsonLd('https://www.pa-tech.dev/'),
    });
  });
});
