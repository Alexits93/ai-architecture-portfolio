import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect, assert } from 'vitest';

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

// README is read as truth too: its tree names only what the repo tracks (plans and specs live in issues).
describe('README tree', () => {
  const line = (dir: string): string => {
    const found = read('README.md').split('\n').find((l) => l.startsWith(dir));
    assert.exists(found, `README tree has no ${dir} line`);
    return found;
  };

  it('describes docs/ as the architecture map and ADRs only', () => {
    expect(line('docs/')).toMatch(/ARCHITECTURE\.md/);
    expect(line('docs/')).not.toMatch(/spec|plan/i);
  });

  it('describes .claude/ without skills', () => {
    expect(line('.claude/')).toMatch(/rules, hooks/);
    expect(line('.claude/')).not.toMatch(/skill/i);
  });
});
