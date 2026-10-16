// Applies the stored theme before first paint. astro.config.mjs injects it as a classic inline
// <head> script, which Astro hashes into script-src, so it costs no request. A block, not globals.
// Without a valid stored choice it sets nothing, so color-scheme: light dark in tokens.css follows the OS.
try {
  const storedTheme = localStorage.getItem("theme");
  if (storedTheme === "dark" || storedTheme === "light") {
    document.documentElement.setAttribute("data-theme", storedTheme);
  }
} catch {
  // Storage is blocked: keep the OS theme.
}
