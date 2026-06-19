export const THEME_STORAGE_KEY = "simosi-dashboard-theme";

export const themeInitScript = `
(function () {
  try {
    var key = "${THEME_STORAGE_KEY}";
    var stored = localStorage.getItem(key);
    var mode = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var resolved = mode === "system" ? (systemDark ? "dark" : "light") : mode;
    var root = document.documentElement;

    root.classList.toggle("dark", resolved === "dark");
    root.dataset.theme = mode;
    root.dataset.resolvedTheme = resolved;
    root.style.colorScheme = resolved;
  } catch (error) {
    document.documentElement.dataset.theme = "system";
  }
})();
`;
