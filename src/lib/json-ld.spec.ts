import { describe, it, expect } from 'vitest';
import { serializeJsonLd } from './json-ld';

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
