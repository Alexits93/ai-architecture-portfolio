import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';

// Every file in public/ ships to production as-is, so an unreferenced file is dead weight
// (often left behind by the web-components migration). Host files are read by convention.
const HOST_FILES = new Set(['_headers', 'robots.txt']);

const root = process.cwd();
const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });

const sources = [...walk(path.join(root, 'src')), ...walk(path.join(root, 'public'))]
  .filter((file) => /\.(astro|ts|css|js|json|txt|webmanifest)$/.test(file))
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n');

describe('public/', () => {
  const assets = walk(path.join(root, 'public'))
    .map((file) => path.relative(path.join(root, 'public'), file))
    .filter((file) => !HOST_FILES.has(file));

  it.each(assets)('references /%s from src or public', (asset) => {
    // The theme toggle builds the icon path from the theme name, so match the stem too.
    const stem = asset.replace(/^(.*\/)(light|dark)(_mode\.svg)$/, '$1${');
    expect(sources.includes(`/${asset}`) || sources.includes(`/${stem}`)).toBe(true);
  });
});
