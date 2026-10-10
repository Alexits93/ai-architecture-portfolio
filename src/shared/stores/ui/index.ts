import { persistentAtom } from '@nanostores/persistent';

export type Theme = 'light' | 'dark';

// undefined is no stored choice: encode returns undefined, so the library removes the key and
// prefers-color-scheme applies. decode maps any other stored value to undefined, as /theme.js does.
export const themeStore = persistentAtom<Theme | undefined>('theme', undefined, {
  encode: (value) => value,
  decode: (stored) => (stored === 'dark' || stored === 'light' ? stored : undefined),
});

// Stores the opposite of the theme on screen: the stored choice, else the OS theme.
export function toggleTheme(systemTheme: Theme): void {
  const current = themeStore.get() ?? systemTheme;
  themeStore.set(current === 'light' ? 'dark' : 'light');
}
