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

// pnpm's own parse of the workspace file, so any YAML layout is checked as pnpm reads it
// (https://pnpm.io/cli/config, pnpm 12.10.1). An unset key prints nothing.
const pnpmConfig = (key: string, unset: string): string =>
  execFileSync('pnpm', ['config', 'get', key, '--json'], { encoding: 'utf8' }) || unset;

describe('Supply chain settings', () => {
  it('pins an exact pnpm 12 release in packageManager', () => {
    expect(pkg.packageManager).toMatch(/^pnpm@12\.\d+\.\d+$/);
  });

  it('delays new releases by at least one day', () => {
    const minutes: number = JSON.parse(pnpmConfig('minimumReleaseAge', '0'));
    expect(minutes).toBeGreaterThanOrEqual(1440);
  });

  // Unlisted packages are unreviewed and fail the install (https://pnpm.io/settings/build, pnpm 12.10.1).
  it('allows build scripts only for reviewed packages', () => {
    const builds: Record<string, boolean> = JSON.parse(pnpmConfig('allowBuilds', '{}'));
    expect(builds).toEqual({ '@resvg/resvg-js': true, esbuild: true, 'unrs-resolver': false });
    expect(workspace).not.toMatch(/onlyBuiltDependencies/);
  });

  it('fails installs on trust downgrades and excludes only exact versions', () => {
    const policy: string = JSON.parse(pnpmConfig('trustPolicy', '"off"'));
    const prune: boolean = JSON.parse(pnpmConfig('trustPolicyExcludePrune', 'false'));
    expect(policy).toBe('no-downgrade');
    expect(prune).toBe(true);
    // Unset after trustPolicyExcludePrune drops the last entry.
    const excludes: string[] = JSON.parse(pnpmConfig('trustPolicyExclude', '[]'));
    for (const entry of excludes) {
      expect(entry).toMatch(/^(?:@[\w.-]+\/)?[\w.-]+@\d+\.\d+\.\d+$/);
    }
  });

  it('applies the fflate override in the lockfile', () => {
    expect(lockfile).toMatch(/^overrides:\n(?: {2}.*\n)*? {2}fflate: '>=0\.7\.5'$/m);
    expect(lockfile).not.toMatch(/^ {2}fflate@0\.7\.[0-4]:$/m);
  });

  // A global fflate bump reached satori and drew .notdef boxes in og.png (#69,
  // https://github.com/vercel/satori/issues/802). Its WOFF decoder needs the 0.7 inflateSync API.
  it('keeps satori on the patched fflate 0.7 line', () => {
    expect(lockfile).toMatch(/^ {2}satori>fflate: 0\.7\.5$/m);
    expect(lockfile).toMatch(/^ {2}'@shuding\/opentype\.js>fflate': 0\.7\.5$/m);
  });

  // .npmrc holds only registry and auth settings (https://pnpm.io/cli/config, pnpm 12.10.1).
  // This project uses neither, so any content there is a setting pnpm ignores or a credential.
  it('keeps .npmrc empty', () => {
    const npmrc = fs.existsSync(path.join(root, '.npmrc')) ? read('.npmrc') : '';
    expect(npmrc.trim()).toBe('');
  });
});

// Dev dependencies run with a write token in release.yml, so the audit covers them too (#173).
// A reviewed list instead of --ignore-unfixable, which also writes ids to pnpm-workspace.yaml and
// passes every future unpatched advisory (https://pnpm.io/cli/audit, pnpm 12.10.1).
describe('Dependency audit', () => {
  it('ignores only listed GHSA ids, each with a comment naming the package and why', () => {
    const ignored: string[] = JSON.parse(pnpmConfig('audit.ignore', '[]'));
    for (const id of ignored) {
      expect(id).toMatch(/^GHSA(?:-[23456789cfghjmpqrvwx]{4}){3}$/);
      expect(workspace).toMatch(new RegExp(`^ {4}- ${RegExp.escape(id)} # \\S+ \\S.*$`, 'm'));
    }
  });

  it.each(['.github/workflows/ci.yml', '.husky/pre-push'])('%s audits every dependency at level high', (file) => {
    const audits = [...read(file).matchAll(/pnpm audit[^&\n]*/g)].map((match) => match[0].trim());
    expect(audits).toEqual(['pnpm audit --audit-level=high']);
  });
});

// Drift is reported weekly by outdated.yml and never blocks a PR.
// https://pnpm.io/cli/outdated (pnpm 12.10.1), https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
const actionFiles = [
  ...fs.readdirSync(path.join(root, '.github/workflows')).map((file) => `.github/workflows/${file}`),
  '.github/actions/setup-pnpm-env/action.yml',
];

describe('CI pnpm setup', () => {
  it('takes the CI pnpm version from packageManager only', () => {
    const action = read('.github/actions/setup-pnpm-env/action.yml');
    expect(action).toMatch(/uses: pnpm\/action-setup@[0-9a-f]{40} # v6\./);
    expect(action).not.toMatch(/^\s+version:/m);
  });

  it.each(actionFiles.filter((file) => !file.endsWith('setup-pnpm-env/action.yml')))(
    '%s sets up pnpm only through the shared action',
    (file) => {
      expect(read(file)).not.toMatch(/pnpm\/action-setup/);
    },
  );
});

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
