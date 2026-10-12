import * as fs from 'fs';
import { describe, it, expect } from 'vitest';

// ADR 001 records why the site is hosted on statichost.eu: the requirements, the rejected alternatives and
// the risks (#176). A host change must rewrite this record, so the spec pins its structure.
const adr = fs.readFileSync('docs/adrs/001-framework-migration.md', 'utf8');

const section = (heading: string): string => {
  const match = adr.match(new RegExp(`^## ${heading}\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'));
  return match ? match[1] : '';
};

describe('ADR 001 hosting record', () => {
  it.each(['Context', 'Decision', 'Alternatives', 'Consequences'])('has a %s section', (heading) => {
    expect(section(heading)).not.toBe('');
  });

  it.each([
    ['EU company and infrastructure', /EU company/],
    ['serves public/_headers unchanged', /`public\/_headers`/],
    ['custom domain with automatic HTTPS', /custom domain/i],
    ['builds on the host', /builds on the host/i],
    ['password-protected staging', /password/i],
    ['free or low cost', /free/i],
  ])('lists the requirement: %s', (_, pattern) => {
    expect(section('Context')).toMatch(pattern);
  });

  it('names statichost.eu as the decision', () => {
    expect(section('Decision')).toMatch(/statichost\.eu/);
  });

  it.each(['Codeberg Pages', 'Bunny', 'Own EU server', 'Netlify', 'Cloudflare Pages', 'Vercel', 'GitHub Pages'])(
    'records why %s was rejected',
    (host) => {
      expect(section('Alternatives')).toContain(host);
    },
  );
});
