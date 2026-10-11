export type Theme = 'light' | 'dark';

const KEY = 'theme';
const listeners = new Set<() => void>();

// Holds the choice for this page when storage throws, so the toggle still works.
let fallback: Theme | undefined;

// Any value other than light or dark is no choice, as in src/lib/theme.js; prefers-color-scheme applies.
export function getStoredTheme(): Theme | undefined {
  try {
    const stored = localStorage.getItem(KEY);
    return stored === 'dark' || stored === 'light' ? stored : undefined;
  } catch {
    return fallback;
  }
}

// Stores the opposite of the theme on screen: the stored choice, else the OS theme.
export function toggleTheme(systemTheme: Theme): void {
  fallback = (getStoredTheme() ?? systemTheme) === 'light' ? 'dark' : 'light';
  try {
    localStorage.setItem(KEY, fallback);
  } catch {
    // Storage is blocked: the choice lasts for this page only.
  }
  listeners.forEach((listener) => listener());
}

// Calls listener after a toggle, after another tab changes or clears the key (key null), and after a
// bfcache restore, which keeps the old DOM (MDN Window storage_event, Window pageshow_event).
export function onThemeChange(listener: () => void): void {
  listeners.add(listener);
  window.addEventListener('storage', (event) => {
    if (event.key === KEY || event.key === null) listener();
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) listener();
  });
}
