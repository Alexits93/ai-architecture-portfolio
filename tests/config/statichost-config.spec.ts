import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect, assert } from 'vitest';

// statichost.eu builds from `statichost.yml` in the repo root with the keys image, command and public
// (https://www.statichost.eu/docs/build-config/). Node.js ships Corepack only before 25.0.0, so on
// Node 26 it comes from `npm install -g corepack` (https://github.com/nodejs/corepack) (#72).

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

const config: Record<string, string> = Object.fromEntries(
  read('statichost.yml')
    .split('\n')
    .flatMap((line) => {
      const match = line.match(/^(\w+):\s*(.+)$/);
      return match ? [[match[1], match[2]]] : [];
    }),
);

describe('statichost.eu build config', () => {
  it('builds on the Node major that CI uses', () => {
    const ciNode = read('.github/actions/setup-pnpm-env/action.yml').match(/node-version:\s*(\d+)/);
    assert.exists(ciNode, 'setup-pnpm-env sets no node-version');
    expect(config.image).toBe(`node:${ciNode[1]}`);
  });

  it('installs Corepack, then the lockfile versions, then builds', () => {
    expect(config.command).toBe('npm install -g corepack && corepack enable && pnpm install --frozen-lockfile && pnpm build');
  });

  it('publishes the Astro output directory', () => {
    expect(config.public).toBe('dist');
  });
});
