// Dark Mode - Load immediately to prevent flash
(function() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();

// Toggle function - call from anywhere
function toggleDarkMode() {
  const current = document.documentElement.getAttribute('data-theme');
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

// Auto-attach to toggle buttons
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.theme-toggle, #themeToggle').forEach(btn => {
    btn.addEventListener('click', toggleDarkMode);
  });
});
