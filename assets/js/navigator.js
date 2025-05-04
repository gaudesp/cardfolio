(() => {
  'use strict';

  // Sélecteurs CSS utilisés dans le Navigator
  const SELECTORS = {
    navItems:     'nav ul li',       // éléments de navigation
    sections:     'article section', // sections de contenu
    wrapper:      'article',         // conteneur principal défilable
    scrollTopBtn: '#scrollTopBtn',   // bouton "retour en haut"
  };

  // Seuil de basculement desktop/mobile et seuil d'affichage du bouton scroll-to-top
  const BREAKPOINT = 1100;
  const SHOW_SCROLL_AFTER = 100;

  /**
   * Classe de base avec logique commune pour desktop et mobile
   */
  class BaseNavigator {
    constructor({ breakpoint }) {
      // Initialisation des éléments DOM
      this.navItems     = Array.from(document.querySelectorAll(SELECTORS.navItems));
      this.sections     = Array.from(document.querySelectorAll(SELECTORS.sections));
      this.wrapper      = document.querySelector(SELECTORS.wrapper);
      this.scrollTopBtn = document.querySelector(SELECTORS.scrollTopBtn);
      this.breakpoint   = breakpoint;
      this.currentTab   = null;
      this.navEl        = document.querySelector('nav');
      this.navHeight    = this.navEl?.offsetHeight ?? 0;

      // Sauvegarde de l'onglet initial, binding des événements et démarrage
      this._cacheInitialState();
      this._bindCommonEvents();
      this._start();
    }

    // Lit la hash de l'URL ou prend le premier onglet
    _cacheInitialState() {
      const hash = window.location.hash.slice(1);
      this.initialTab = hash || this.navItems[0].dataset.tab;
    }

    // Bind des événements partagés (clic nav, resize, scroll, bouton top)
    _bindCommonEvents() {
      this.navItems.forEach(item =>
        item.addEventListener('click', this._onNavClick.bind(this))
      );
      window.addEventListener('resize', this._onResize.bind(this));
      window.addEventListener('scroll', this._onScrollSpy.bind(this));

      if (this.scrollTopBtn) {
        // Afficher/masquer le bouton "retour en haut"
        window.addEventListener('scroll', () => {
          this.scrollTopBtn.classList.toggle(
            'show',
            window.pageYOffset > SHOW_SCROLL_AFTER
          );
        });
        // Scroll to top on click
        this.scrollTopBtn.addEventListener('click', e => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }
    }

    // Démarrage : sélection et affichage de l'onglet initial
    _start() {
      this.currentTab = this.initialTab;
      this._updateNav(this.currentTab);
      this._updateSection(this.currentTab);
      this._prepareWrapper();
    }

    // Met à jour l'état actif des items de navigation
    _updateNav(tab) {
      this.navItems.forEach(item =>
        item.classList.toggle('active', item.dataset.tab === tab)
      );
    }

    // Affiche la section correspondante et cache les autres
    _updateSection(tab) {
      this.sections.forEach(sec => {
        const active = sec.id === tab;
        sec.classList.toggle('active', active);
        sec.style.display = active ? '' : 'none';
      });
      // Reset du scroll interne du wrapper
      this.wrapper.scrollTop = 0;
    }

    // Handler clic nav : activation ou reclic sur même onglet
    _onNavClick(evt) {
      evt.preventDefault();
      const tab = evt.currentTarget.dataset.tab;

      if (tab === this.currentTab) {
        this._onSameTabClick(tab);
      } else {
        this._activateTab(tab);
      }
    }

    // Placeholders à redéfinir selon mobile/desktop
    _onResize() {}
    _onScrollSpy() {}
    _onSameTabClick(tab) {}

    // Activation basique : mise à jour nav + section + hash
    _activateTab(tab) {
      this._updateNav(tab);
      this._updateSection(tab);
      window.location.hash = tab;
      this.currentTab = tab;
    }
  }

  /**
   * Navigator pour desktop : slide animations
   */
  class DesktopNavigator extends BaseNavigator {
    // Prépare l'animation d'entrée
    _prepareWrapper() {
      document.body.classList.add('js-ready');
      this.wrapper.classList.add('slide-in');
      this.wrapper.addEventListener(
        'transitionend',
        () => this.wrapper.classList.remove('slide-in'),
        { once: true }
      );
    }

    // Activation avec slide-out puis slide-in
    _activateTab(tab) {
      if (this.isAnimating) return;
      this.isAnimating = true;

      // Phase slide-out
      this.wrapper.addEventListener(
        'transitionend',
        () => {
          // Changement de section
          super._updateSection(tab);
          // Phase slide-in
          this.wrapper.classList.replace('slide-out', 'slide-in');
          this.wrapper.addEventListener(
            'transitionend',
            () => {
              this.wrapper.classList.remove('slide-in');
              this.isAnimating = false;
            },
            { once: true }
          );
        },
        { once: true }
      );

      // Trigger reflow + début slide-out
      this.wrapper.offsetWidth;
      this.wrapper.classList.add('slide-out');

      // Mise à jour nav, hash et scroll top
      super._updateNav(tab);
      window.location.hash = tab;
      document.documentElement.scrollTop = 0;
      this.currentTab = tab;
    }
  }

  /**
   * Navigator pour mobile : scroll smooth + scroll spy
   */
  class MobileNavigator extends BaseNavigator {
    // Prépare l'affichage sans animation
    _prepareWrapper() {
      document.body.classList.add('js-ready');
    }

    // Activation : scroll vers la section
    _activateTab(tab) {
      super._updateNav(tab);
      this._scrollToSection(tab);
      window.location.hash = tab;
      this.currentTab = tab;
    }

    // Défilement lisse en compensant la hauteur de la nav
    _scrollToSection(tab) {
      const el = document.getElementById(tab);
      if (!el) return;
      this.navHeight = this.navEl?.offsetHeight ?? 0;
      const y = el.getBoundingClientRect().top + window.pageYOffset - this.navHeight;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }

    // Scroll spy : mise à jour de l'onglet actif en scrollant
    _onScrollSpy() {
      this.navHeight = this.navEl?.offsetHeight ?? 0;
      const offset = this.navHeight;
      let newTab = null;
      for (const sec of this.sections) {
        const rect = sec.getBoundingClientRect();
        if (rect.top <= offset && rect.bottom > offset) {
          newTab = sec.id;
          break;
        }
      }
      if (newTab && newTab !== this.currentTab) {
        this._updateNav(newTab);
        this.currentTab = newTab;
      }
    }

    // Si on reclique sur le même onglet, on remonte vers son sommet
    _onSameTabClick(tab) {
      this._scrollToSection(tab);
    }
  }

  // Initialisation au chargement du DOM
  document.addEventListener('DOMContentLoaded', () => {
    let navigator;
    const isDesktop = window.innerWidth > BREAKPOINT;
    navigator = isDesktop
      ? new DesktopNavigator({ breakpoint: BREAKPOINT })
      : new MobileNavigator({ breakpoint: BREAKPOINT });

    // Sur resize crossing breakpoint → reload pour réinitialiser le mode
    window.addEventListener('resize', () => {
      const nowDesktop = window.innerWidth > BREAKPOINT;
      const wasDesktop = navigator instanceof DesktopNavigator;
      if (nowDesktop !== wasDesktop) {
        window.location.reload();
      }
    });
  });
})();
