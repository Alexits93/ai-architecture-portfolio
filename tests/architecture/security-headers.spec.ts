import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';

// public/_headers is the host contract (statichost.eu reads it from the publish root).
// https://www.statichost.eu/docs/custom-headers/
// The page CSP (hashes) is a <meta> tag from astro.config.mjs; e2e/csp.spec.ts covers it.

const headers = fs.readFileSync(path.join(process.cwd(), 'public/_headers'), 'utf8');

const block = (route: string): string => {
  const escaped = route.replace(/[*/]/g, '\\$&');
  return headers.match(new RegExp(`^${escaped}\\n((?:[ \\t]+.*\\n?)*)`, 'm'))?.[1] ?? '';
};

const SITE_WIDE = [
  'Content-Security-Policy: frame-ancestors \'none\'',
  'X-Frame-Options: DENY',
  'X-Content-Type-Options: nosniff',
  'Referrer-Policy: strict-origin-when-cross-origin',
  'Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Strict-Transport-Security: max-age=63072000; includeSubDomains',
  'Cross-Origin-Opener-Policy: same-origin',
  'Cross-Origin-Resource-Policy: same-origin',
  'Cross-Origin-Embedder-Policy: require-corp',
];

const lines = (text: string): string[] => text.split('\n').map((line) => line.trim()).filter(Boolean);
const name = (line: string): string => line.slice(0, line.indexOf(':')).toLowerCase();

describe('public/_headers', () => {
  const site = block('*');

  it.each(SITE_WIDE)('sets "%s" site-wide', (line) => {
    expect(site).toMatch(new RegExp(`^\\s+${line.replace(/[()*;]/g, '\\$&')}$`, 'm'));
  });

  it('sets nothing else site-wide', () => {
    expect(lines(site)).toEqual(SITE_WIDE);
  });

  // statichost.eu uses the last matched occurrence of a header, so a later path block could weaken one.
  it('never overrides a site-wide header in a path block', () => {
    const siteNames = SITE_WIDE.map(name);
    const indented = lines(headers.split(/^\S.*$/m).slice(2).join('\n'));
    expect(indented.map(name).filter((header) => siteNames.includes(header))).toEqual([]);
  });

  it('drops headers that browsers ignore or OWASP rejects', () => {
    expect(headers).not.toMatch(/interest-cohort|X-XSS-Protection|Expect-CT|Public-Key-Pins/);
  });

  it('caches content-hashed Astro assets for one year', () => {
    expect(block('/_astro/*')).toMatch(/^\s+Cache-Control: public, max-age=31536000, immutable$/m);
  });
});
