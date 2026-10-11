import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';

// The gate configs and the tests that pin them are read-only in the sandbox, and the Edit tool asks the
// owner before it changes them (https://code.claude.com/docs/en/sandboxing, https://code.claude.com/docs/en/permissions).
const settings: {
  $schema?: string;
  sandbox: { filesystem: { denyWrite: string[] } };
  permissions: { ask: string[] };
} = JSON.parse(fs.readFileSync(path.join(process.cwd(), '.claude/settings.json'), 'utf8'));

const { denyWrite } = settings.sandbox.filesystem;
const isDir = (entry: string): boolean => fs.statSync(path.join(process.cwd(), entry)).isDirectory();

describe('Protected paths', () => {
  it.each(['./tests/architecture', './tests/config'])('makes the gate tests in %s read-only', (dir) => {
    expect(denyWrite).toContain(dir);
  });

  it.each(denyWrite)('asks the owner before the Edit tool changes %s', (entry) => {
    expect(settings.permissions.ask).toContain(isDir(entry) ? `Edit(${entry}/**)` : `Edit(${entry})`);
  });

  // Validation in the editor only: the schema can lag behind the CLI (https://code.claude.com/docs/en/settings).
  it('points the editor at the settings schema', () => {
    expect(settings.$schema).toBe('https://json.schemastore.org/claude-code-settings.json');
  });
});
