import { persistentAtom } from '@nanostores/persistent';

type Theme = 'light' | 'dark';

// decode maps any stored value but dark to light, the same fallback as /theme.js.
export const themeStore = persistentAtom<Theme>('theme', 'light', {
  encode: (value) => value,
  decode: (stored) => (stored === 'dark' ? 'dark' : 'light'),
});

export function toggleTheme(): void {
  const current = themeStore.get();
  themeStore.set(current === 'light' ? 'dark' : 'light');
}
