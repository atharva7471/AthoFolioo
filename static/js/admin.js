// ===== Root Colors =====
(function () {
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
})();

// ===== Theme Toggle Button =====
(function () {
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
    btn.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
    );
    btn.title = btn.getAttribute("aria-label");
  }

  setIcon(currentTheme());
  btn.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    setIcon(next);
  });
})();

