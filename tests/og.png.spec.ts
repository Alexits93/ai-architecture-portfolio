import type { APIContext } from 'astro';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/pages/og.png';
import * as ogModule from '@/shared/lib/og/generate-og-image';

describe('og.png endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a 200 response with PNG image', async () => {
    const mockBuffer = Buffer.from('89504e470d0a1a0a', 'hex');
    vi.spyOn(ogModule, 'generateOgImage').mockResolvedValue(mockBuffer);

    const context = {} as APIContext;
    const response = await GET(context);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    expect(buffer).toEqual(mockBuffer);
  });

  it('should return a 500 response on error', async () => {
    vi.spyOn(ogModule, 'generateOgImage').mockRejectedValue(new Error('Test error'));

    const context = {} as APIContext;
    const response = await GET(context);

    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toBe('Error generating OG image');
  });
});
