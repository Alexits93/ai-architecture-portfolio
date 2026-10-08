import { persistentAtom } from '@nanostores/persistent';

export const themeStore = persistentAtom<'light' | 'dark'>('theme', 'light');

export function toggleTheme(): void {
  const current = themeStore.get();
  themeStore.set(current === 'light' ? 'dark' : 'light');
}
