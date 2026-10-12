import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';

// Releases are git tags and GitHub Releases only, so nothing pushes to master and the master ruleset
// needs no bypass (#177). semantic-release "strongly recommend[s] against" release commits
// (https://semantic-release.gitbook.io/semantic-release/support/faq), and a set `plugins` list
// replaces the defaults (https://semantic-release.gitbook.io/semantic-release/usage/plugins).

type PluginEntry = string | [string, object];

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

const release: { plugins: PluginEntry[] } = JSON.parse(read('.releaserc.json'));
const pkg: { devDependencies: Record<string, string> } = JSON.parse(read('package.json'));

const pluginName = (entry: PluginEntry): string => (typeof entry === 'string' ? entry : entry[0]);

describe('Release config', () => {
  it('runs only the plugins that tag and publish a GitHub Release', () => {
    expect(release.plugins.map(pluginName)).toEqual([
      '@semantic-release/commit-analyzer',
      '@semantic-release/release-notes-generator',
      '@semantic-release/github',
    ]);
  });

  it.each(['@semantic-release/git', '@semantic-release/changelog'])('does not install %s', (plugin) => {
    expect(Object.keys(pkg.devDependencies)).not.toContain(plugin);
  });
});
