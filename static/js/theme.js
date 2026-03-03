// ===== Theme: Apply saved theme immediately (prevents flash-of-wrong-theme) =====
(function () {
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
})();

// ===== Theme Toggle Button (runs after DOM is ready) =====
document.addEventListener("DOMContentLoaded", function () {
  const root = document.documentElement;
  const btn = document.getElementById("themeToggle");
  if (!btn) return;

  function currentTheme() {
    return root.getAttribute("data-theme") || "dark";
  }

  function setIcon(theme) {
    btn.innerHTML =
      theme === "dark"
        ? '<i class="bi bi-sun"></i>'
        : '<i class="bi bi-moon-stars"></i>';
    const label =
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
    btn.setAttribute("aria-label", label);
    btn.title = label;
  }

  setIcon(currentTheme());

  btn.addEventListener("click", function () {
    const next = currentTheme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    setIcon(next);
  });
});
