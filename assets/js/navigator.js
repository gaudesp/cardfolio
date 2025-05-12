// navigator.js
// Gestion responsive de la navigation : DesktopNavigator
// (animations de glissement) et MobileNavigator (scroll)

export const NAVIGATOR_SELECTORS = {
  navItems:     'nav ul li[data-tab]',
  sections:     'article section',
  wrapper:      'article',
  scrollTopBtn: '#scrollTopBtn',
};

export const NAVIGATOR_BREAKPOINT      = 1100;
export const NAVIGATOR_SHOW_SCROLL_AFTER = 100;
export const NAVIGATOR_SCROLL_THROTTLE_MS = 50;

/**
 * Fonction utilitaire pour limiter la fréquence d’exécution
 */
export function throttle(fn, wait) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn.apply(this, args);
    }
  };
}

/**
 * Classe de base pour la navigation entre sections
 * Gère le scroll spy, le changement de zones (desktop/tablette/mobile) et le bouton "haut de page"
 */
export class BaseNavigator {
  constructor(breakpoint = NAVIGATOR_BREAKPOINT, startTab = null) {
    // Initialisation des propriétés et binding des événements
    this.breakpoint       = breakpoint;
    this.navItems         = Array.from(document.querySelectorAll(NAVIGATOR_SELECTORS.navItems));
    this.sections         = Array.from(document.querySelectorAll(NAVIGATOR_SELECTORS.sections));
    this.wrapper          = document.querySelector(NAVIGATOR_SELECTORS.wrapper);
    this.scrollTopBtn     = document.querySelector(NAVIGATOR_SELECTORS.scrollTopBtn);
    this.navEl            = document.querySelector('nav');
    this.currentTab       = startTab || this._initialTab();
    this.prevZone         = this._getZone();
    this.isManualScroll   = false;
    this.scrollSpyEnabled = true;

    this._bindCommon();
    this._prepareWrapper();
    this._start();
  }

  // Détermine la zone courante selon la largeur de fenêtre
  _getZone() {
    const w = window.innerWidth;
    if (w > this.breakpoint) return 'desktop';
    if (w > 655) return 'tablet';
    return 'mobile';
  }

  // Récupère l’onglet initial depuis le hash ou le premier élément
  _initialTab() {
    const hash = window.location.hash.slice(1);
    return hash || this.navItems[0]?.dataset.tab;
  }

  // Bind des événements communs (click nav, resize, scroll)
  _bindCommon() {
    this._onNavClickBound   = e => this._onNavClick(e);
    this._onResizeBound     = () => this._onResize();
    this._scrollSpyBound    = throttle(() => this._onScrollSpy(), NAVIGATOR_SCROLL_THROTTLE_MS);
    this._toggleScrollBound = () =>
      this.scrollTopBtn?.classList.toggle('show', window.pageYOffset > NAVIGATOR_SHOW_SCROLL_AFTER);
    this._onScrollTopBound  = e => { e.preventDefault(); this._onScrollTopClick(); };

    this.navItems.forEach(item => item.addEventListener('click', this._onNavClickBound));
    window.addEventListener('resize', this._onResizeBound);
    window.addEventListener('scroll', this._scrollSpyBound);

    if (this.scrollTopBtn) {
      window.addEventListener('scroll', this._toggleScrollBound);
      this.scrollTopBtn.addEventListener('click', this._onScrollTopBound);
    }
  }

  // Nettoyage des listeners lors du switch de mode
  _destroy() {
    this.navItems.forEach(item => item.removeEventListener('click', this._onNavClickBound));
    window.removeEventListener('resize', this._onResizeBound);
    window.removeEventListener('scroll', this._scrollSpyBound);
    if (this.scrollTopBtn) {
      window.removeEventListener('scroll', this._toggleScrollBound);
      this.scrollTopBtn.removeEventListener('click', this._onScrollTopBound);
    }
  }

  // Démarrage : active la nav et la section initiales
  _start() {
    this._updateNav(this.currentTab);
    this._updateSection(this.currentTab);
  }

  // Met à jour la classe active sur les items de navigation
  _updateNav(tab) {
    this.navItems.forEach(item =>
      item.classList.toggle('active', item.dataset.tab === tab)
    );
  }

  // Affiche la section active et cache les autres
  _updateSection(tab) {
    this.sections.forEach(sec => {
      const isActive = sec.id === tab;
      sec.classList.toggle('active', isActive);
      sec.style.display = isActive ? '' : 'none';
    });
    if (this.wrapper) this.wrapper.scrollTop = 0;
    this._unloadIframe(tab);
  }

  // Décharge l’iframe de la section d’erreur si on change d’onglet
  _unloadIframe(tab) {
    const iframe = document.querySelector('#error iframe');
    if (!iframe) return;
    if (iframe.src && tab !== 'error') {
      iframe.dataset.src = iframe.src;
      iframe.src = '';
    }
  }

  // Gestion du redimensionnement et switch entre Desktop/Mobile
  _onResize() {
    const newZone = this._getZone();
    if (newZone === this.prevZone) return;

    this.scrollSpyEnabled = false;
    if (newZone === 'desktop' || this.prevZone === 'desktop') {
      this._switchMode(
        newZone === 'desktop' ? DesktopNavigator : MobileNavigator,
        this.currentTab
      );
    } else {
      this._updateNav(this.currentTab);
      this._updateSection(this.currentTab);
      if (this instanceof MobileNavigator) {
        this.isManualScroll = true;
        this._scrollTo(this.currentTab);
      }
    }
    this.prevZone = newZone;
    setTimeout(() => {
      this.isManualScroll = false;
      this.scrollSpyEnabled = true;
    }, 600);
  }

  // Remplace l’instance actuelle par une nouvelle (Desktop ↔ Mobile)
  _switchMode(NavClass, startTab) {
    this._destroy();
    const instance = new NavClass(this.breakpoint, startTab);
    window.navigatorInstance = instance;
    if (instance instanceof MobileNavigator) {
      instance.isManualScroll = true;
      instance._scrollTo(instance.currentTab);
    }
  }

  // Placeholders pour les méthodes spécifiques à chaque mode
  _prepareWrapper() {}
  _onNavClick(evt) {}

  // Scroll spy : met à jour la nav selon le scroll
  _onScrollSpy() {
    if (!this.scrollSpyEnabled || this.isManualScroll) return;
    this.navHeight = this.navEl?.offsetHeight || 0;
    let active = null;
    for (const sec of this.sections) {
      const { top, bottom } = sec.getBoundingClientRect();
      if (top <= this.navHeight && bottom > this.navHeight) {
        active = sec.id;
        break;
      }
    }
    if (active && active !== this.currentTab) {
      this._updateNav(active);
      this._updateSection(active);
      this.currentTab = active;
      history.replaceState(null, '', `#${active}`);
    }
  }

  // Placeholder pour le clic sur le bouton "haut de page"
  _onScrollTopClick() {}
}

/**
 * Navigation Desktop : animations de transition entre sections
 */
export class DesktopNavigator extends BaseNavigator {
  // Initialise la navigation en vérifiant la validité de l’onglet courant
  _start() {
    // Si l’onglet initial n’existe pas, redirige vers "error"
    if (!document.getElementById(this.currentTab)) {
      this.currentTab = 'error';
      history.replaceState(null, '', `#${this.currentTab}`);
    }
    super._updateNav(this.currentTab);
    super._updateSection(this.currentTab);
  }

  // Prépare l’interface : ajoute les classes pour les animations d’entrée
  _prepareWrapper() {
    document.body.classList.add('js-ready');
    this.wrapper.classList.add('initial-hide');
    setTimeout(() => {
      this.wrapper.classList.replace('initial-hide', 'slide-in');
      this.wrapper.addEventListener('transitionend', () => this.wrapper.classList.remove('slide-in'), { once: true });
      this._fadeInSection(this.currentTab);
      this.isAnimating = false;
    }, 100);
  }
  
  // Gère le clic sur un onglet en lançant une transition
  _onNavClick(evt) {
    evt.preventDefault();
    const tab = evt.currentTarget.dataset.tab;
    if (tab === this.currentTab || this.isAnimating) return;
    this._activateTab(tab);
  }

  // Lance l’animation de sortie puis met à jour l’onglet
  _activateTab(tab) {
    this.isAnimating = true;
    this.wrapper.addEventListener('transitionend', () => {
      super._updateSection(tab);
      this._enter();
      this._fadeInSection(tab);
    }, { once: true });
    this._exit();
    super._updateNav(tab);
    history.replaceState(null, '', `#${tab}`);
    document.documentElement.scrollTop = 0;
    this.currentTab = tab;
  }

  // Lance l’animation de glissement de sortie
  _exit() {
    void this.wrapper.offsetWidth;
    this.wrapper.classList.add('slide-out');
  }

  // Lance l’animation de glissement d’entrée
  _enter() {
    this.wrapper.classList.replace('slide-out', 'slide-in');
    this.wrapper.addEventListener('transitionend', () => {
      this.wrapper.classList.remove('slide-in');
      this.isAnimating = false;
    }, { once: true });
  }

  // Anime l’apparition des éléments de la section active
  _fadeInSection(tab) {
    const sec = document.getElementById(tab);
    if (!sec) return;
    sec.removeAttribute('data-fading');
    sec.childNodes.forEach((el, i) => el.style?.setProperty('--fade-delay', `${i * 10}ms`));
    void sec.offsetWidth;
    sec.setAttribute('data-fading', '');
  }
}

/**
 * Navigation Mobile : scroll fluide entre sections
 */
export class MobileNavigator extends BaseNavigator {
  // Prépare le mode mobile : active l’onglet courant et écoute les interactions tactiles
  _prepareWrapper() {
    document.body.classList.add('js-ready');
    if (this.currentTab && !this.isManualScroll && window.location.hash) {
      this.isManualScroll = true;
      this._activateTab(this.currentTab);
    }
    ['wheel', 'touchstart'].forEach(evt => window.addEventListener(evt, () => this.isManualScroll = false, { passive: true }));
  }

  // Gère le clic sur un onglet en scrollant ou en activant
  _onNavClick(evt) {
    evt.preventDefault();
    const tab = evt.currentTarget.dataset.tab;
    this.isManualScroll = true;
    if (tab === this.currentTab) this._scrollTo(tab);
    else this._activateTab(tab);
  }

  // Active un onglet (maj nav + scroll vers la section)
  _activateTab(tab) {
    super._updateNav(tab);
    this._scrollTo(tab);
    history.replaceState(null, '', `#${tab}`);
    this.currentTab = tab;
  }

  // Scroll fluide vers la section donnée
  _scrollTo(tab) {
    const el = document.getElementById(tab);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Scroll vers le haut de page et réinitialise l’onglet actif
  _onScrollTopClick() {
    this.isManualScroll = true;
    const defaultTab = this.navItems[0]?.dataset.tab || this._initialTab();
    this.currentTab = defaultTab;
    super._updateNav(defaultTab);
    super._updateSection(defaultTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    history.replaceState(null, '', window.location.pathname);
    setTimeout(() => {
      this.isManualScroll = false;
    }, 500);
  }
}
