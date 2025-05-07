const SELECTORS = {
  navItems:     'nav ul li[data-tab]', // Éléments de navigation
  sections:     'article section',     // Sections de contenu à afficher/masquer
  wrapper:      'article',             // Conteneur principal des sections
  scrollTopBtn: '#scrollTopBtn',       // Bouton retour en haut
};

const BREAKPOINT = 1100;               // Largeur en px pour le basculement mobile/desktop
const SHOW_SCROLL_AFTER = 100;         // Scroll Y après lequel le bouton scroll-top apparaît
const SCROLL_THROTTLE_MS = 50;         // Délai minimal entre 2 appels à scrollSpy

// Fonction utilitaire : limite la fréquence d'appel d'une fonction
function throttle(fn, wait) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn.apply(this, args);
    }
  };
}

// Classe de base pour les comportements communs desktop/mobile
class BaseNavigator {
  constructor(breakpoint) {
    this.breakpoint = breakpoint;
    this.navItems   = [...document.querySelectorAll(SELECTORS.navItems)];
    this.sections   = [...document.querySelectorAll(SELECTORS.sections)];
    this.wrapper    = document.querySelector(SELECTORS.wrapper);
    this.scrollTopBtn = document.querySelector(SELECTORS.scrollTopBtn);
    this.navEl      = document.querySelector('nav');
    this.navHeight  = this.navEl?.offsetHeight || 0;
    this.currentTab = this._initialTab(); // Détermine le tab actif via URL ou premier item
    this.prevZone   = window.innerWidth > BREAKPOINT ? 'desktop' : (window.innerWidth > 655 ? 'tablet' : 'mobile');

    this._bindCommon();      // Lie les événements communs (scroll, click, resize...)
    this._prepareWrapper();  // Préparation spécifique (hook pour les classes enfants)
    this._start();           // Active le bon onglet/section au chargement
  }

  // Nettoie les listeners avant de changer de mode
  destroy() {
    this.navItems.forEach(item =>
      item.removeEventListener('click', this._onNavClickBound)
    );
    window.removeEventListener('resize', this._onResizeBound);
    window.removeEventListener('scroll', this._scrollSpyBound);
    if (this.scrollTopBtn) {
      window.removeEventListener('scroll', this._toggleScrollBound);
      this.scrollTopBtn.removeEventListener('click', this._onScrollTopBound);
    }
  }

  // Récupère l'onglet actif depuis l'URL ou utilise le premier onglet
  _initialTab() {
    const hash = window.location.hash.slice(1);
    return hash || this.navItems[0]?.dataset.tab;
  }

  // Lie tous les événements communs (clicks, scroll, resize)
  _bindCommon() {
    this._onNavClickBound = e => this._onNavClick(e);
    this._onResizeBound   = () => this._onResize();
    this._scrollSpyBound  = throttle(() => this._onScrollSpy(), SCROLL_THROTTLE_MS);
    this._toggleScrollBound = () =>
      this.scrollTopBtn?.classList.toggle('show', window.pageYOffset > SHOW_SCROLL_AFTER);
    this._onScrollTopBound = e => { e.preventDefault(); this._onScrollTopClick(); };

    this.navItems.forEach(item =>
      item.addEventListener('click', this._onNavClickBound)
    );
    window.addEventListener('resize', this._onResizeBound);
    window.addEventListener('scroll', this._scrollSpyBound);
    if (this.scrollTopBtn) {
      window.addEventListener('scroll', this._toggleScrollBound);
      this.scrollTopBtn.addEventListener('click', this._onScrollTopBound);
    }
  }

  // Active l'onglet et la section courants
  _start() {
    this._updateNav(this.currentTab);
    this._updateSection(this.currentTab);
  }

  // Active l'onglet visuellement
  _updateNav(tab) {
    this.navItems.forEach(item =>
      item.classList.toggle('active', item.dataset.tab === tab)
    );
  }

  // Affiche la bonne section, masque les autres
  _updateSection(tab) {
    this.sections.forEach(sec => {
      const active = sec.id === tab;
      sec.classList.toggle('active', active);
      sec.style.display = active ? '' : 'none';
    });
    if (this.wrapper) this.wrapper.scrollTop = 0;
  }

  // Hooks (à surcharger)
  _prepareWrapper() {}
  _onNavClick(evt) {}

  // Surveille le redimensionnement pour basculer entre desktop, tablette et mobile
  _onResize() {
    const w = window.innerWidth;
    const isDesktop = w > this.breakpoint;
    const isTablet  = w <= this.breakpoint && w > 655;
    const isMobile  = w <= 655;

    if ((this.prevZone === 'desktop') !== isDesktop) {
      this._switchMode(isDesktop ? DesktopNavigator : MobileNavigator, !isDesktop);
      this.prevZone = isDesktop ? 'desktop' : 'mobile';
      return;
    }

    if (this.prevZone === 'tablet' && isMobile) {
      this._switchMode(MobileNavigator, true);
      this.prevZone = 'mobile';
      return;
    }
    if (this.prevZone === 'mobile' && isTablet) {
      this._switchMode(MobileNavigator, true);
      this.prevZone = 'tablet';
      return;
    }
  }

  _switchMode(NavClass, scrollToTab) {
    this.destroy();
    navigatorInstance = new NavClass(this.breakpoint);
    if (scrollToTab && navigatorInstance instanceof MobileNavigator) {
      navigatorInstance.isManualScroll = true;
      navigatorInstance._scrollTo(this.currentTab);
      setTimeout(() => {
        navigatorInstance.isManualScroll = false;
      }, 1000);
    }
    navigatorInstance._updateNav(this.currentTab);
    navigatorInstance._updateSection(this.currentTab);
  }

  _onScrollSpy() {}
  _onScrollTopClick() {}
}

// Comportement spécifique au mode Desktop : transitions + animations
class DesktopNavigator extends BaseNavigator {
  _prepareWrapper() {
    document.body.classList.add('js-ready');
    this.wrapper.classList.add('slide-in');
    this.wrapper.addEventListener('transitionend', () =>
      this.wrapper.classList.remove('slide-in'), { once: true }
    );
    this.isAnimating = false;
  }

  _onNavClick(evt) {
    evt.preventDefault();
    const tab = evt.currentTarget.dataset.tab;
    if (tab === this.currentTab || this.isAnimating) return;
    this._activateTab(tab);
  }

  _activateTab(tab) {
    this.isAnimating = true;
    this.wrapper.addEventListener('transitionend', () => {
      super._updateSection(tab);
      this._enter();
    }, { once: true });

    this._exit();
    super._updateNav(tab);
    history.replaceState(null, '', `#${tab}`);
    document.documentElement.scrollTop = 0;
    this.currentTab = tab;
  }

  _exit() {
    void this.wrapper.offsetWidth;
    this.wrapper.classList.add('slide-out');
  }

  _enter() {
    this.wrapper.classList.replace('slide-out', 'slide-in');
    this.wrapper.addEventListener('transitionend', () => {
      this.wrapper.classList.remove('slide-in');
      this.isAnimating = false;
    }, { once: true });
  }
}

// Comportement spécifique au mode Mobile : scroll naturel, spy, scrollTop
class MobileNavigator extends BaseNavigator {
  _prepareWrapper() {
    document.body.classList.add('js-ready');
    ['wheel','touchstart'].forEach(evt =>
      window.addEventListener(evt, () => this.isManualScroll = false, { passive: true })
    );
    this.isManualScroll = false;
  }

  _onNavClick(evt) {
    evt.preventDefault();
    const tab = evt.currentTarget.dataset.tab;
    this.isManualScroll = true;
    if (tab === this.currentTab) this._scrollTo(tab);
    else this._activateTab(tab);
  }

  _activateTab(tab) {
    super._updateNav(tab);
    this._scrollTo(tab);
    history.replaceState(null, '', `#${tab}`);
    this.currentTab = tab;
  }

  _scrollTo(tab) {
    const el = document.getElementById(tab);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  _onScrollSpy() {
    if (this.isManualScroll) return;
    this.navHeight = this.navEl?.offsetHeight || 0;
    let active = null;
    for (const sec of this.sections) {
      const { top, bottom } = sec.getBoundingClientRect();
      if (top <= this.navHeight && bottom > this.navHeight) {
        active = sec.id; break;
      }
    }
    if (active && active !== this.currentTab) {
      super._updateNav(active);
      super._updateSection(active);
      this.currentTab = active;
    }
  }

  _onScrollTopClick() {
    this.isManualScroll = true;
    super._updateNav(this.navItems[0].dataset.tab);
    this.sections.forEach(sec => { sec.classList.remove('active'); sec.style.display='none'; });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    history.replaceState(null, '', window.location.pathname);
    setTimeout(() => this.isManualScroll = false, 1000);
  }
}

// Initialisation
let navigatorInstance = null;
window.addEventListener('DOMContentLoaded', () => {
  const isDesktop = window.innerWidth > BREAKPOINT;
  navigatorInstance = new (isDesktop ? DesktopNavigator : MobileNavigator)(BREAKPOINT);
});
