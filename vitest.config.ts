import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['tests/**', '**/*.config.*', 'src/env.d.ts', 'src/pages/**'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
        perFile: true
      }
    }
  }
});
