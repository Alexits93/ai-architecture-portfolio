import { assert, describe, expect, it, vi } from 'vitest';
import { version } from '@playwright/test/package.json' with { type: 'json' };

// The remote browser must match the installed test runner (https://playwright.dev/docs/docker) (#91).
const loadConfig = async (podman: string | undefined) => {
  vi.resetModules();
  vi.stubEnv('PW_WEBKIT_PODMAN', podman);
  const { default: config } = await import('../../playwright.config');
  vi.unstubAllEnvs();
  return config;
};

type Config = Awaited<ReturnType<typeof loadConfig>>;

const commands = (config: Config) => [config.webServer].flat().map((server) => (server === undefined ? '' : server.command));

const connectOptions = (config: Config, name: string) => {
  assert.exists(config.projects);
  const project = config.projects.find((p) => p.name === name);
  assert.exists(project);
  assert.exists(project.use);
  return project.use.connectOptions;
};

describe('local WebKit under Podman', () => {
  it('runs the Playwright image and run-server of the installed @playwright/test version', async () => {
    const podman = commands(await loadConfig('1')).find((command) => command.startsWith('podman run '));
    assert.exists(podman);
    expect(podman).toContain(` mcr.microsoft.com/playwright:v${version}-noble `);
    expect(podman).toContain(`playwright@${version} run-server`);
  });

  it('connects only the webkit project to the container', async () => {
    const config = await loadConfig('1');
    expect(connectOptions(config, 'webkit')).toEqual({ wsEndpoint: 'ws://127.0.0.1:3000/', exposeNetwork: '<loopback>' });
    expect(connectOptions(config, 'chromium')).toBeUndefined();
    expect(connectOptions(config, 'firefox')).toBeUndefined();
  });

  it('keeps native WebKit and one web server without the flag, as in CI', async () => {
    const config = await loadConfig(undefined);
    expect(connectOptions(config, 'webkit')).toBeUndefined();
    expect(commands(config)).toEqual(['pnpm preview --port 4322 --ignore-lock']);
  });
});
