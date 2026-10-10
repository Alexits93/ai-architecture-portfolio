// Applies the stored theme before first paint. Loaded as a classic blocking script from <head>
// so it runs before render. It is a file, not inline, because Astro does not hash is:inline code.
// It loads before the CSP <meta>, which does not govern earlier content (W3C CSP3, meta element).
// Without a valid stored choice it sets nothing, so prefers-color-scheme in global.css applies.
try {
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme === 'dark' || storedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', storedTheme);
  }
} catch {
  // Storage is blocked: keep the OS theme.
}
