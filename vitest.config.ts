/// <reference types="vitest" />
import { getViteConfig } from 'astro/config';
import { defineConfig } from 'vitest/config';

export default defineConfig(
  getViteConfig({
    test: {
      environment: 'node',
      include: ['src/**/*.spec.ts', 'tests/**/*.spec.ts'],
      exclude: ['e2e/**'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary', 'json'],
        include: ['src/**'],
        exclude: ['tests/**', 'e2e/**', '**/*.config.*', 'src/env.d.ts', 'src/pages/**', '**/*.md'],
        thresholds: {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
          perFile: true
        }
      }
    }
  })
);
