import { execFileSync } from 'child_process';
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
    // pnpm's own parse of the workspace file, so any YAML layout is checked as pnpm reads it
    // (https://pnpm.io/cli/config). An unset key prints nothing, as after trustPolicyExcludePrune.
    const excludes: string[] = JSON.parse(
      execFileSync('pnpm', ['config', 'get', 'trustPolicyExclude', '--json'], { encoding: 'utf8' }) || '[]',
    );
    for (const entry of excludes) {
      expect(entry).toMatch(/^(?:@[\w.-]+\/)?[\w.-]+@\d+\.\d+\.\d+$/);
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

// Drift is reported weekly by outdated.yml and never blocks a PR.
// https://pnpm.io/cli/outdated (pnpm 12.10.1), https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
const actionFiles = [
  ...fs.readdirSync(path.join(root, '.github/workflows')).map((file) => `.github/workflows/${file}`),
  '.github/actions/setup-pnpm-env/action.yml',
];

describe('Version drift report', () => {
  const outdated = read('.github/workflows/outdated.yml');

  it('runs weekly and on demand', () => {
    expect(outdated).toMatch(/^on:\n {2}schedule:\n {4}- cron: '[\d*]+ [\d*]+ \* \* [0-6]'\n {2}workflow_dispatch:$/m);
  });

  it('has read-only contents permission and no secrets', () => {
    expect(outdated).toMatch(/^permissions:\n {2}contents: read\n\n/m);
    expect(outdated).not.toMatch(/secrets\./);
  });

  it('checks packages and GitHub Actions and writes the table to the job summary', () => {
    expect(outdated).toMatch(/pnpm outdated --include-github-actions .*\$GITHUB_STEP_SUMMARY/);
    // Without pipefail the exit code of tee would hide the failing pnpm outdated.
    expect(outdated).toMatch(/^\s+shell: bash$/m);
  });

  it.each(actionFiles.filter((file) => !file.endsWith('outdated.yml')))('%s never runs pnpm outdated', (file) => {
    expect(read(file)).not.toMatch(/pnpm outdated/);
  });

  // pnpm outdated skipped dorny/test-reporter pinned at the moving tag v1, so a pin names its exact release.
  it.each(actionFiles)('%s pins every remote action to a SHA and an exact release', (file) => {
    const uses = [...read(file).matchAll(/^\s+(?:- )?uses: (?!\.\/)(.+)$/gm)].map((match) => match[1]);
    for (const ref of uses) {
      expect(ref).toMatch(/^[\w.-]+\/[\w./-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/);
    }
  });
});
