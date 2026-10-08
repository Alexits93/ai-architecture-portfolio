import { describe, it, expect, beforeEach } from 'vitest';
import { themeStore, toggleTheme } from './index';

describe('UI Stores', () => {
  beforeEach(() => {
    themeStore.set('light');
  });

  it('should toggle theme state', () => {
    expect(themeStore.get()).toBe('light');
    toggleTheme();
    expect(themeStore.get()).toBe('dark');
    toggleTheme();
    expect(themeStore.get()).toBe('light');
  });
});
