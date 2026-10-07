import { describe, it, expect, beforeEach } from 'vitest';
import { isMenuOpen, themeStore, toggleMenu, toggleTheme } from './index';

describe('UI Stores', () => {
  beforeEach(() => {
    isMenuOpen.set(false);
    themeStore.set('light');
  });

  it('should toggle menu state', () => {
    expect(isMenuOpen.get()).toBe(false);
    toggleMenu();
    expect(isMenuOpen.get()).toBe(true);
    toggleMenu();
    expect(isMenuOpen.get()).toBe(false);
  });

  it('should toggle theme state', () => {
    expect(themeStore.get()).toBe('light');
    toggleTheme();
    expect(themeStore.get()).toBe('dark');
    toggleTheme();
    expect(themeStore.get()).toBe('light');
  });
});
