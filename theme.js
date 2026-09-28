// Dark mode toggle.
// Loaded in <head> so the saved theme is applied before the page is drawn (no white flash).
// Light is the default; the choice is saved in localStorage and shared by all pages.
(function () {
  var STORAGE_KEY = "acc-theme";

  function getSavedTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
    } catch (e) {
      return "light";
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      // localStorage not available: the theme still works, it just isn't remembered
    }
  }

  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  function updateButton(button, theme) {
    // Show the icon of the mode you switch TO
    button.textContent = theme === "dark" ? "☀️" : "🌙";
    var label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
    button.setAttribute("aria-label", label);
    button.title = label;
  }

  var currentTheme = getSavedTheme();
  applyTheme(currentTheme);

  document.addEventListener("DOMContentLoaded", function () {
    var button = document.getElementById("theme-toggle");
    if (!button) return;

    updateButton(button, currentTheme);

    button.addEventListener("click", function () {
      currentTheme = currentTheme === "dark" ? "light" : "dark";
      applyTheme(currentTheme);
      saveTheme(currentTheme);
      updateButton(button, currentTheme);
    });
  });
})();
