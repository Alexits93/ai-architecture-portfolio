import fs from 'node:fs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateOgImage, renderOgSvg } from './generate-og-image';

describe('generateOgImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // The fs spies replace a real module function, so restore it for the next test.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate a PNG buffer successfully', async () => {
    const title = 'Test Title';
    const description = 'Test Description';

    const buffer = await generateOgImage(title, description);

    // Verify it returns a Buffer
    expect(Buffer.isBuffer(buffer)).toBe(true);

    // PNG magic number check
    expect(buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  });

  // A character without a glyph maps to .notdef, so every letter draws the same box.
  it('draws distinct bold glyphs for distinct title characters', async () => {
    expect(await renderOgSvg('H', 'x')).not.toBe(await renderOgSvg('I', 'x'));
  });

  it('draws distinct regular glyphs for distinct description characters', async () => {
    expect(await renderOgSvg('x', 'H')).not.toBe(await renderOgSvg('x', 'I'));
  });

  it('rejects when a font file is unparsable', async () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('not a font'));

    await expect(generateOgImage('Title', 'Description')).rejects.toThrow();
  });

  it('rejects when a font file is missing', async () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory');
    });

    await expect(generateOgImage('Title', 'Description')).rejects.toThrow('ENOENT');
  });
});
