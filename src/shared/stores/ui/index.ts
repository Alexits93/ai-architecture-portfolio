import { atom } from 'nanostores';

export const isMenuOpen = atom<boolean>(false);
export const themeStore = atom<'light' | 'dark'>('light');

export function toggleMenu(): void {
  isMenuOpen.set(!isMenuOpen.get());
}

export function toggleTheme(): void {
  const current = themeStore.get();
  themeStore.set(current === 'light' ? 'dark' : 'light');
}
