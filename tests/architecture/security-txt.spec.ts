import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect, assert } from 'vitest';

// RFC 9116: a security.txt past its Expires date is stale (section 2.5.5). This test fails on that date, so the file
// is renewed before it misleads a researcher (https://www.rfc-editor.org/rfc/rfc9116).
const text = fs.readFileSync(path.join(process.cwd(), 'public/.well-known/security.txt'), 'utf8');

describe('public/.well-known/security.txt', () => {
  it('has not expired', () => {
    const expires = text.match(/^Expires: (.+)$/m);
    assert.exists(expires, 'security.txt has no Expires field');
    expect(Date.parse(expires[1])).toBeGreaterThan(Date.now());
  });
});
