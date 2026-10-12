import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';

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
