import { cleanTestStorage, getTestStorage, setTestStorageKey, useTestStorageEngine } from '@nanostores/persistent';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { themeStore, toggleTheme, type Theme } from './index';

// The library's fake storage (@nanostores/persistent 1.3.5, index.d.ts) stands in for localStorage.
beforeAll(() => {
  useTestStorageEngine();
});

beforeEach(() => {
  themeStore.set(undefined);
  cleanTestStorage();
});

describe('themeStore', () => {
  it('holds no theme until the visitor picks one', () => {
    expect(themeStore.get()).toBeUndefined();
    expect(getTestStorage()).toEqual({});
  });

  it('removes the key when the choice is cleared', () => {
    themeStore.set('dark');
    themeStore.set(undefined);
    expect(getTestStorage()).toEqual({});
  });

  // /theme.js treats an invalid stored value as no choice; the store must not undo that.
  it.each([
    ['dark', 'dark'],
    ['light', 'light'],
    ['bogus', undefined],
    ['', undefined],
  ])('reads stored "%s" as %s', (stored, expected) => {
    const unsubscribe = themeStore.listen(() => {});
    setTestStorageKey('theme', stored);
    expect(themeStore.get()).toBe(expected);
    unsubscribe();
  });
});

describe('toggleTheme', () => {
  // With no stored choice the toggle flips the theme the OS shows.
  const fromSystem: [Theme, Theme][] = [
    ['light', 'dark'],
    ['dark', 'light'],
  ];
  it.each(fromSystem)('toggles from the OS theme %s to a stored %s', (system, expected) => {
    toggleTheme(system);
    expect(themeStore.get()).toBe(expected);
    expect(getTestStorage()).toEqual({ theme: expected });
  });

  it('toggles a stored theme regardless of the OS theme', () => {
    themeStore.set('dark');
    toggleTheme('dark');
    expect(themeStore.get()).toBe('light');
    toggleTheme('dark');
    expect(themeStore.get()).toBe('dark');
  });
});
