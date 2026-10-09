// Applies the stored theme before first paint. Loaded as a classic blocking script from <head>
// so it runs before render. It is a file, not inline, because Astro does not hash is:inline code.
// It loads before the CSP <meta>, which does not govern earlier content (W3C CSP3, meta element).
try {
  var storedTheme = localStorage.getItem('theme');
  var theme = storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : 'light';
  document.documentElement.setAttribute('data-theme', theme);
} catch {
  document.documentElement.setAttribute('data-theme', 'light');
}
