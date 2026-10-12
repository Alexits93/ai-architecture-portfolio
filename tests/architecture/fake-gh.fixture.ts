import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { assert } from 'vitest';

// Every fake bin directory is removed by removeFakeBins, including those built in it.each tables.
const fakeBins: string[] = [];
export const removeFakeBins = (): void => fakeBins.forEach((bin) => fs.rmSync(bin, { recursive: true, force: true }));

// Puts a fake `gh` first on PATH that prints `answer` and exits with `status`, and a fake `git` on `branch`.
export const fakeGh = (answer: string, status: number, branch = 'master'): { PATH: string } => {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-gh-'));
  fakeBins.push(bin);
  fs.writeFileSync(path.join(bin, 'answer.json'), answer);
  fs.writeFileSync(path.join(bin, 'gh'), `#!/bin/sh\ncat "${bin}/answer.json"\nexit ${status}\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(bin, 'git'), `#!/bin/sh\necho ${branch}\n`, { mode: 0o755 });
  assert.exists(process.env.PATH);
  return { PATH: `${bin}${path.delimiter}${process.env.PATH}` };
};

export const connection = <T>(nodes: T[]) => ({ pageInfo: { hasNextPage: false, hasPreviousPage: false }, nodes });
export const planIssue = (issue: { number: number; title: string; parent: { number: number } | null }, branches: string[] = []) =>
  ({ ...issue, blockedBy: connection([]), linkedBranches: connection(branches.map((name) => ({ ref: { name } }))) });
