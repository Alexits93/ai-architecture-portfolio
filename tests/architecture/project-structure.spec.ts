import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';

describe('Project Structure & Tooling Check (Deterministic Guardrails)', () => {
  it('should enforce Astro 7+ loaders (no legacy src/content/config.ts)', () => {
    const legacyConfigPath = path.join(process.cwd(), 'src/content/config.ts');
    const modernConfigPath = path.join(process.cwd(), 'src/content.config.ts');

    expect(fs.existsSync(legacyConfigPath)).toBe(false);
    
    // We enforce that if a content collection exists, it must use the modern file
    const contentDirExists = fs.existsSync(path.join(process.cwd(), 'src/content'));
    if (contentDirExists) {
      expect(fs.existsSync(modernConfigPath)).toBe(true);
    }
  });


});
