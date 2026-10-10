import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import * as fs from 'fs';
import { describe, it, expect } from 'vitest';
import SeoHead from '@/shared/ui/seo-head/SeoHead.astro';

// Correction #115: the testing rule claimed AstroContainer inherits `site` from astro.config.mjs.
// Astro 7.3.8 takes it only from `astroConfig` (dist/container/index.js); an upgrade that changes this fails here.
const render = async (options: Parameters<typeof AstroContainer.create>[0]) =>
  (await AstroContainer.create(options)).renderToString(SeoHead, {
    props: { title: 'T', description: 'D' },
    request: new Request('https://www.pa-tech.dev/cv/'),
  });

describe('Testing rule: AstroContainer site', () => {
  it('has no site without astroConfig', async () => {
    await expect(render(undefined)).rejects.toThrow('SeoHead requires `site`');
  });

  it('takes site from astroConfig', async () => {
    expect(await render({ astroConfig: { site: 'https://www.pa-tech.dev' } })).toContain(
      '<link rel="canonical" href="https://www.pa-tech.dev/cv/">',
    );
  });

  it('states this in the testing rule', () => {
    const rule = fs.readFileSync('.claude/rules/testing.md', 'utf8');
    expect(rule).not.toMatch(/inherits `site`/);
    expect(rule).toMatch(/`astroConfig: \{ site \}`/);
  });
});
