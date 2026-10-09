// Applies the stored theme before first paint. Loaded as a classic blocking script from <head>
// so it runs before render, and from a file (not inline) so the hash-based CSP allows it via 'self'.
try {
  var storedTheme = localStorage.getItem('theme');
  var theme = storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : 'light';
  document.documentElement.setAttribute('data-theme', theme);
} catch {
  document.documentElement.setAttribute('data-theme', 'light');
}
