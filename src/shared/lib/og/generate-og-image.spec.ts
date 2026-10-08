import { describe, it, expect } from 'vitest';
import { generateOgImage } from './generate-og-image';

describe('generateOgImage', () => {
  it('should generate a PNG buffer successfully', async () => {
    const title = 'Test Title';
    const description = 'Test Description';
    
    const buffer = await generateOgImage(title, description);
    
    // Verify it returns a Buffer
    expect(Buffer.isBuffer(buffer)).toBe(true);
    
    // PNG magic number check
    expect(buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  });
});
