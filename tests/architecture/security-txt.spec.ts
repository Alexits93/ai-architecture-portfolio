import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect, assert } from 'vitest';

// RFC 9116: Expires is required, and a security.txt past it is stale (section 2.5.5). This test fails
// on that date, so the file is renewed before it misleads a researcher (#314).
// https://www.rfc-editor.org/rfc/rfc9116

const text = fs.readFileSync(path.join(process.cwd(), 'public/.well-known/security.txt'), 'utf8');

const field = (name: string): string => {
  const match = text.match(new RegExp(`^${name}: (.+)$`, 'm'));
  assert.exists(match, `security.txt has no ${name} field`);
  return match[1];
};

describe('public/.well-known/security.txt', () => {
  it('names the private advisory form as contact', () => {
    expect(field('Contact')).toBe('https://github.com/Alexits93/ai-architecture-portfolio/security/advisories/new');
  });

  it('has not expired', () => {
    expect(Date.parse(field('Expires'))).toBeGreaterThan(Date.now());
  });

  it('names its canonical URL on the production site', () => {
    expect(field('Canonical')).toBe('https://www.pa-tech.dev/.well-known/security.txt');
  });

  it('states the preferred language', () => {
    expect(field('Preferred-Languages')).toBe('en');
  });
});
