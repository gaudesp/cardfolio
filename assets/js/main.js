import {
  NAVIGATOR_BREAKPOINT,
  DesktopNavigator,
  MobileNavigator,
} from './navigator.js';

import { FormspreeHandler } from './formspree.js';

import { ThemeManager } from './theme.js';
import { RecaptchaManager } from './recaptcha.js';

document.addEventListener('DOMContentLoaded', () => {
  window.recaptchaManager = new RecaptchaManager();
  window.themeManager = new ThemeManager('#themeToggleBtn');

  const loader  = document.querySelector('#appLoader');
  const content = document.querySelector('#appContent');
  if (loader && content) {
    loader.style.display  = '';
    content.style.display = 'none';
  }

  window.addEventListener('load', () => {
    setTimeout(() => {
      if (loader && content) {
        loader.style.display  = 'none';
        content.style.display = '';
      }

      const isDesktop = window.innerWidth > NAVIGATOR_BREAKPOINT;
      window.navigatorInstance = new (isDesktop
        ? DesktopNavigator
        : MobileNavigator)(NAVIGATOR_BREAKPOINT);

      window.recaptchaManager.render();
      window.formspreeHandler = new FormspreeHandler();
    }, 100);
  });
});
