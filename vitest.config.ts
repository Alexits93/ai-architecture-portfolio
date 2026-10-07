/// <reference types="vitest" />
import { getViteConfig } from 'astro/config';
import { defineConfig } from 'vitest/config';

export default defineConfig(
  getViteConfig({
    test: {
      environment: 'node',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary', 'json'],
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
  })
);
