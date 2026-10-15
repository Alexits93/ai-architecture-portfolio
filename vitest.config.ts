import { getViteConfig } from 'astro/config';
import { defineConfig } from 'vitest/config';

export default defineConfig(
  getViteConfig({
    test: {
      environment: 'node',
      include: ['src/**/*.spec.ts', 'tests/**/*.spec.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary', 'json'],
        include: ['src/**'],
        // Content, not code: an imported image is a module Astro generates (#261), like the collections' Markdown and YAML.
        exclude: ['**/*.config.*', 'src/pages/**', '**/*.md', '**/*.yaml', '**/*.jpg'],
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
