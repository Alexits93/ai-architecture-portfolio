import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/pages/og.png';
import * as ogModule from '@/lib/og-image';
import { SITE } from '@/consts';

describe('og.png endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a 200 response with PNG image', async () => {
    const mockBuffer = Buffer.from('89504e470d0a1a0a', 'hex');
    vi.spyOn(ogModule, 'generateOgImage').mockResolvedValue(mockBuffer);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    expect(buffer).toEqual(mockBuffer);
  });

  it('draws the title and description from SITE', async () => {
    const spy = vi.spyOn(ogModule, 'generateOgImage').mockResolvedValue(Buffer.from('89504e470d0a1a0a', 'hex'));

    await GET();

    expect(spy).toHaveBeenCalledExactlyOnceWith(SITE.title, SITE.description);
  });

  // A rejected GET fails `astro build` instead of shipping an error body as og.png.
  it('propagates a generation error', async () => {
    vi.spyOn(ogModule, 'generateOgImage').mockRejectedValue(new Error('Test error'));

    await expect(GET()).rejects.toThrow('Test error');
  });
});
