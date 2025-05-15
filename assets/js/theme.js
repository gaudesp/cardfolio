// Gestion du thème clair/sombre : stockage en localStorage,
// bascule avec un bouton et render du reCAPTCHA.
export class ThemeManager {
  constructor(toggleBtnSelector) {
    this.toggleBtn = document.querySelector(toggleBtnSelector);
    this.root = document.documentElement;

    this._applyInitialTheme();
    this._bindEvents();
  }

  // Applique le thème initial (stocké ou préférence système)
  _applyInitialTheme() {
    const stored = localStorage.getItem('preferred-theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (systemDark ? 'dark' : 'light');
    this._setTheme(theme, false);
  }

  // Attach du listener sur le bouton de bascule
  _bindEvents() {
    if (!this.toggleBtn) return;
    this.toggleBtn.addEventListener('click', () => this._toggleTheme());
  }

  // Bascule entre les thèmes clair et sombre
  _toggleTheme() {
    const next = this.root.classList.contains('dark') ? 'light' : 'dark';
    this._setTheme(next);
  }

  // Applique le thème + label + recaptcha
  _setTheme(theme, save = true) {
    const dark = theme === 'dark';
    this.root.classList.toggle('dark', dark);
    if (save) localStorage.setItem('preferred-theme', theme);
    this._updateToggleLabel(theme);
    if (window.recaptchaManager) window.recaptchaManager.render();
  }

  // Met à jour l'icône et l'aria-label du bouton
  _updateToggleLabel(theme) {
    const label = theme === 'dark' ? '☀️' : '🌙';
    if (!this.toggleBtn) return;
    this.toggleBtn.textContent = label;
    this.toggleBtn.setAttribute(
      'aria-label',
      theme === 'dark' ? 'Activer le thème clair' : 'Activer le thème sombre'
    );
  }
}
