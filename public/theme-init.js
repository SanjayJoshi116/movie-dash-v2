// Runs before first paint (a blocking <script> in index.html's <head>), so a dark-theme user never
// sees a white page while the bundle loads (B35). Mirrors ThemeContext: a saved choice under
// movieDash_theme wins, else the OS preference, else dark. ThemeContext takes over once React mounts.
// A file, not an inline script: the production CSP is script-src 'self'.
(function () {
  var theme = null;
  try {
    var saved = localStorage.getItem('movieDash_theme');
    if (saved === 'dark' || saved === 'light') theme = saved;
  } catch (e) { /* storage blocked: fall through to the OS preference */ }
  if (!theme) {
    try {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (e) {
      theme = 'dark';
    }
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
