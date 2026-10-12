import * as fs from 'fs';
import * as path from 'path';
import { assert, describe, it, expect } from 'vitest';

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const ci = read('.github/workflows/ci.yml');

// Ruleset 24675871 requires up-to-date branches, so the squash commit has the content the PR run
// tested and a push run on master repeats it. Release triggers on push by itself.
// https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
describe('CI triggers', () => {
  it('runs CI on pull requests and merge groups, not on push', () => {
    expect(ci).toMatch(/^on:\n {2}pull_request:\n {4}branches: \["master", "main"\]\n {2}merge_group:\n {4}branches: \["master", "main"\]\n\n/m);
  });

  it('still releases on push to master', () => {
    expect(read('.github/workflows/release.yml')).toMatch(/^on:\n {2}push:\n {4}branches:\n {6}- master\n/m);
  });
});

// Ruleset 24675871 requires these check names; renaming a job blocks every PR.
it.each([
  'Code Quality (Lint, Typecheck, Test)',
  'Security & Dependency Scan',
  'Build Verification',
  'E2E (Playwright, all engines)',
])('keeps the required check name %s', (name) => {
  expect(ci).toContain(`    name: ${name}\n`);
});

// Least privilege (#171): once a permissions block names a scope, every unnamed scope is none, so
// each job block lists all it needs (https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).
// Scopes per action README at the pinned release: vitest-coverage-report-action v2.13.0 (pull-requests write),
// dorny/test-reporter v3.2.0 (checks write), semantic-release/github (contents, issues, pull-requests write).
describe('Token permissions', () => {
  const workflows = fs.readdirSync(path.join(process.cwd(), '.github/workflows')).map((file) => `.github/workflows/${file}`);
  // A job without its own block inherits the top-level one; the lazy scan stops at the next job key.
  const jobPermissions = (yaml: string, job: string): string => {
    expect(yaml).toMatch(new RegExp(`^ {2}${job}:$`, 'm'));
    const match = new RegExp(`^ {2}${job}:\\n(?:(?: {4}.*)?\\n)*? {4}permissions:\\n((?: {6}.+\\n)*)`, 'm').exec(yaml);
    return match === null ? '' : match[1].replace(/ #.*$/gm, '');
  };

  it.each(workflows)('%s grants no write scope at the top level', (file) => {
    const block = /^permissions:\n((?: {2}.+\n)*)/m.exec(read(file));
    assert.exists(block);
    expect(block[1]).toMatch(/^ {2}contents: read$/m);
    expect(block[1]).not.toMatch(/write/);
  });

  it.each([
    ['.github/workflows/ci.yml', 'quality-gate', '      contents: read\n      checks: write\n      pull-requests: write\n'],
    ['.github/workflows/ci.yml', 'security-gate', ''],
    ['.github/workflows/ci.yml', 'build-gate', ''],
    ['.github/workflows/ci.yml', 'e2e-gate', '      contents: read\n'],
    ['.github/workflows/release.yml', 'release', '      contents: write\n      issues: write\n      pull-requests: write\n'],
  ])('%s job %s has exactly its scopes', (file, job, scopes) => {
    expect(jobPermissions(read(file), job)).toBe(scopes);
  });

  it.each(workflows)('%s grants write scopes only to the listed jobs', (file) => {
    const writes = [...read(file).matchAll(/^ {6}([\w-]+): write\b/gm)].map((match) => match[1]);
    const expected: Record<string, string[]> = {
      '.github/workflows/ci.yml': ['checks', 'pull-requests'],
      '.github/workflows/release.yml': ['contents', 'issues', 'pull-requests'],
    };
    expect(writes).toEqual(file in expected ? expected[file] : []);
  });
});

// timeout-minutes defaults to 360 (workflow syntax docs); Playwright: "Always set a global timeout in CI"
// (https://playwright.dev/docs/ci, https://playwright.dev/docs/api/class-testconfig#test-config-global-timeout).
describe('E2E hang guard', () => {
  it('cancels the E2E job after 20 minutes', () => {
    expect(ci).toMatch(/^ {2}e2e-gate:\n {4}name: .+\n {4}runs-on: .+\n {4}timeout-minutes: 20\n/m);
  });

  it('stops the Playwright suite after 15 minutes on CI', () => {
    expect(read('playwright.config.ts')).toContain('  globalTimeout: process.env.CI ? 15 * 60 * 1000 : undefined,\n');
  });
});
