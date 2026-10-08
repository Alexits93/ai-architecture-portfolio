import { atom } from 'nanostores';

export const themeStore = atom<'light' | 'dark'>('light');

export function toggleTheme(): void {
  const current = themeStore.get();
  themeStore.set(current === 'light' ? 'dark' : 'light');
}
