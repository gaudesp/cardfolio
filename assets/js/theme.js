// Gestion du thème clair/sombre : stockage en localStorage,
// bascule avec un bouton et render du reCAPTCHA.

const THEME_KEY = 'preferred-theme';
const THEME_CLASS_DARK = 'dark';

export class ThemeManager {
  constructor(toggleBtnSelector) {
    this.toggleBtn = document.querySelector(toggleBtnSelector);
    this.root = document.documentElement;

    this._applyInitialTheme();
    this._bindEvents();
  }

  // Applique le thème initial (stocké ou préférence système)
  _applyInitialTheme() {
    const storedTheme = localStorage.getItem(THEME_KEY);
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = storedTheme ? storedTheme : (systemPrefersDark ? 'dark' : 'light');
    const alreadyApplied = this.root.classList.contains(THEME_CLASS_DARK);
    if ((theme === 'dark' && alreadyApplied) || (theme === 'light' && !alreadyApplied)) {
      this._updateToggleLabel(theme);
      return;
    }
    this._setTheme(theme);
  }

  // Attach du listener sur le bouton de bascule
  _bindEvents() {
    if (!this.toggleBtn) return;
    this.toggleBtn.addEventListener('click', () => this._toggleTheme());
  }

  /**
   * Bascule entre les thèmes clair et sombre.
   */
  _toggleTheme() {
    const isDark = this.root.classList.contains(THEME_CLASS_DARK);
    this._setTheme(isDark ? 'light' : 'dark');
  }

  // Applique le thème et met à jour le label du bouton
  _setTheme(theme) {
    if (theme === 'dark') {
      this.root.classList.add(THEME_CLASS_DARK);
      localStorage.setItem(THEME_KEY, 'dark');
      this._updateToggleLabel('dark');
    } else {
      this.root.classList.remove(THEME_CLASS_DARK);
      localStorage.setItem(THEME_KEY, 'light');
      this._updateToggleLabel('light');
    }
    // Re-rendu du reCAPTCHA pour respecter le thème
    if (window.recaptchaManager) {
      window.recaptchaManager.render();
    }
  }

  // Met à jour l’icône et l’aria-label du bouton selon le thème
  _updateToggleLabel(theme) {
    if (this.toggleBtn) {
      this.toggleBtn.setAttribute(
        'aria-label',
        theme === 'dark'
          ? 'Activer le thème clair'
          : 'Activer le thème sombre'
      );
      this.toggleBtn.textContent =
        theme === 'dark' ? '☀️' : '🌙';
    }
  }
}
