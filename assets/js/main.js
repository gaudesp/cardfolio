import {
  NAVIGATOR_BREAKPOINT,
  DesktopNavigator,
  MobileNavigator,
} from './navigator.js';

import { FormspreeHandler } from './formspree.js';

import { ThemeManager } from './theme.js';
import { RecaptchaManager } from './recaptcha.js';
import { TypewriterRotator } from './typewriter.js';

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

      window.typewriterRotator = new TypewriterRotator('#typewriter-text', [
        'Développeur Ruby on Rails',
        'Développeur Node.js',
        'Développeur Python',
        'Développeur PHP',
        'Développeur JavaScript',
        'Développeur TypeScript',
        'Développeur HTML/CSS'
      ], {
        speed: 50,
        pause: 4000,
        initialDelay: 500
      });

      const isDesktop = window.innerWidth > NAVIGATOR_BREAKPOINT;
      window.navigatorInstance = new (isDesktop
        ? DesktopNavigator
        : MobileNavigator)(NAVIGATOR_BREAKPOINT);

      window.recaptchaManager.render();
      window.formspreeHandler = new FormspreeHandler();
    }, 100);
  });
});
