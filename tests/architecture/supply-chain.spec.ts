import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';

// pnpm 11+ reads security settings only from pnpm-workspace.yaml and ignores them in .npmrc,
// so these checks fail CI when a setting drifts into a file pnpm no longer reads.

const root = process.cwd();
const read = (file: string): string => fs.readFileSync(path.join(root, file), 'utf8');

const pkg: { packageManager?: string } = JSON.parse(read('package.json'));
const workspace = read('pnpm-workspace.yaml');
const lockfile = read('pnpm-lock.yaml');

describe('Supply chain settings', () => {
  it('pins an exact pnpm 12 release in packageManager', () => {
    expect(pkg.packageManager).toMatch(/^pnpm@12\.\d+\.\d+$/);
  });

  it('delays new releases by at least one day', () => {
    const minutes = Number(workspace.match(/^minimumReleaseAge:\s*(\d+)$/m)?.[1]);
    expect(minutes).toBeGreaterThanOrEqual(1440);
  });

  it('allows build scripts only through allowBuilds', () => {
    expect(workspace).toMatch(/^allowBuilds:$/m);
    expect(workspace).not.toMatch(/onlyBuiltDependencies/);
  });

  it('fails installs on trust downgrades and excludes only exact versions', () => {
    expect(workspace).toMatch(/^trustPolicy: no-downgrade$/m);
    expect(workspace).toMatch(/^trustPolicyExcludePrune: true$/m);
    // Every indented line under the key must be an exact-version entry. A flow list such as
    // `[chokidar]` or deeper indentation fails here instead of skipping the check.
    const [, inline = '', excludes = ''] = workspace.match(/^trustPolicyExclude:(.*)\n((?:[ \t].*\n)*)/m) ?? [];
    expect(inline).toBe('');
    for (const entry of excludes.split('\n').filter(Boolean)) {
      expect(entry).toMatch(/^ {2}- (?:@[\w.-]+\/)?[\w.-]+@\d+\.\d+\.\d+$/);
    }
  });

  it('applies the fflate override in the lockfile', () => {
    expect(lockfile).toMatch(/^overrides:\n(?: {2}.*\n)*? {2}fflate: '>=0\.7\.5'$/m);
    expect(lockfile).not.toMatch(/^ {2}fflate@0\.7\.[0-4]:$/m);
  });

  it('keeps .npmrc free of pnpm settings', () => {
    const npmrc = fs.existsSync(path.join(root, '.npmrc')) ? read('.npmrc') : '';
    expect(npmrc).not.toMatch(/release-age|workspace-root-check/);
  });

  it('takes the CI pnpm version from packageManager only', () => {
    const action = read('.github/actions/setup-pnpm-env/action.yml');
    expect(action).toMatch(/uses: pnpm\/action-setup@[0-9a-f]{40} # v6\./);
    expect(action).not.toMatch(/^\s+version:/m);
  });
});
