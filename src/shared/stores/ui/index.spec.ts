// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Theme } from './index';

// jsdom (Vitest 5.0.3 control comment) supplies localStorage, StorageEvent and PageTransitionEvent.
// A fresh module per test resets the in-memory fallback for blocked storage.
let store: typeof import('./index');

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  store = await import('./index');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getStoredTheme', () => {
  it('holds no theme until the visitor picks one', () => {
    expect(store.getStoredTheme()).toBeUndefined();
  });

  // /theme.js treats an invalid stored value as no choice; the store must not undo that.
  it.each([
    ['dark', 'dark'],
    ['light', 'light'],
    ['blue', undefined],
    ['', undefined],
  ])('reads stored "%s" as %s', (stored, expected) => {
    localStorage.setItem('theme', stored);
    expect(store.getStoredTheme()).toBe(expected);
  });
});

describe('toggleTheme', () => {
  // With no stored choice the toggle flips the theme the OS shows.
  const fromSystem: [Theme, Theme][] = [
    ['light', 'dark'],
    ['dark', 'light'],
  ];
  it.each(fromSystem)('toggles from the OS theme %s to a stored %s', (system, expected) => {
    store.toggleTheme(system);
    expect(localStorage.getItem('theme')).toBe(expected);
  });

  it('toggles a stored theme regardless of the OS theme', () => {
    localStorage.setItem('theme', 'dark');
    store.toggleTheme('dark');
    expect(store.getStoredTheme()).toBe('light');
    store.toggleTheme('dark');
    expect(store.getStoredTheme()).toBe('dark');
  });

  it('notifies the listener', () => {
    const render = vi.fn();
    store.onThemeChange(render);
    store.toggleTheme('light');
    expect(render).toHaveBeenCalledOnce();
  });

  it('keeps the choice in the page when storage throws', () => {
    const blocked = () => {
      throw new DOMException('Storage is blocked', 'SecurityError');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    const render = vi.fn();
    store.onThemeChange(render);

    expect(store.getStoredTheme()).toBeUndefined();
    expect(() => store.toggleTheme('dark')).not.toThrow();
    expect(store.getStoredTheme()).toBe('light');
    expect(render).toHaveBeenCalledOnce();
  });
});

describe('onThemeChange', () => {
  // Another tab fires storage with the key, or with key null after localStorage.clear() (MDN StorageEvent).
  it.each([['theme'], [null]])('re-renders on a storage event with key %s', (key) => {
    const render = vi.fn();
    store.onThemeChange(render);
    window.dispatchEvent(new StorageEvent('storage', { key, storageArea: localStorage }));
    expect(render).toHaveBeenCalledOnce();
  });

  it('ignores a storage event for another key', () => {
    const render = vi.fn();
    store.onThemeChange(render);
    window.dispatchEvent(new StorageEvent('storage', { key: 'other', storageArea: localStorage }));
    expect(render).not.toHaveBeenCalled();
  });

  // A bfcache restore keeps the old DOM, so the page re-reads storage another tab may have changed.
  it.each([
    [true, 1],
    [false, 0],
  ])('re-renders on pageshow with persisted %s', (persisted, calls) => {
    const render = vi.fn();
    store.onThemeChange(render);
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted }));
    expect(render).toHaveBeenCalledTimes(calls);
  });

  it('adds no global to window', () => {
    const before = Object.keys(window);
    store.onThemeChange(() => {});
    store.toggleTheme('light');
    expect(Object.keys(window)).toEqual(before);
  });
});
