import { cleanTestStorage, setTestStorageKey, useTestStorageEngine } from '@nanostores/persistent';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { themeStore, toggleTheme } from './index';

describe('UI Stores', () => {
  // The library's fake storage (@nanostores/persistent 1.3.5, index.d.ts) stands in for localStorage.
  beforeAll(() => {
    useTestStorageEngine();
  });

  beforeEach(() => {
    cleanTestStorage();
    themeStore.set('light');
  });

  it('should toggle theme state', () => {
    expect(themeStore.get()).toBe('light');
    toggleTheme();
    expect(themeStore.get()).toBe('dark');
    toggleTheme();
    expect(themeStore.get()).toBe('light');
  });

  // /theme.js maps an invalid stored value to light; the store must not undo that.
  it.each([
    ['dark', 'dark'],
    ['light', 'light'],
    ['bogus', 'light'],
    ['', 'light'],
  ])('reads stored "%s" as %s', (stored, expected) => {
    const unsubscribe = themeStore.listen(() => {});
    setTestStorageKey('theme', stored);
    expect(themeStore.get()).toBe(expected);
    unsubscribe();
  });
});
