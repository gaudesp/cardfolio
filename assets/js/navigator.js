// Refactored navigator.js
export const NAVIGATOR_SELECTORS = {
  navItems:     'nav ul li[data-tab]',
  sections:     'article section',
  wrapper:      'article',
  scrollTopBtn: '#scrollTopBtn',
};

export const NAVIGATOR_BREAKPOINT      = 1100;
export const NAVIGATOR_SHOW_SCROLL_AFTER = 100;
export const NAVIGATOR_SCROLL_THROTTLE_MS = 50;

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

export class BaseNavigator {
  constructor(breakpoint = NAVIGATOR_BREAKPOINT, startTab = null) {
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

  _getZone() {
    const w = window.innerWidth;
    if (w > this.breakpoint) return 'desktop';
    if (w > 655) return 'tablet';
    return 'mobile';
  }

  _initialTab() {
    const hash = window.location.hash.slice(1);
    return hash || this.navItems[0]?.dataset.tab;
  }

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

  destroy() {
    this.navItems.forEach(item => item.removeEventListener('click', this._onNavClickBound));
    window.removeEventListener('resize', this._onResizeBound);
    window.removeEventListener('scroll', this._scrollSpyBound);
    if (this.scrollTopBtn) {
      window.removeEventListener('scroll', this._toggleScrollBound);
      this.scrollTopBtn.removeEventListener('click', this._onScrollTopBound);
    }
  }

  _start() {
    this._updateNav(this.currentTab);
    this._updateSection(this.currentTab);
  }

  _updateNav(tab) {
    this.navItems.forEach(item =>
      item.classList.toggle('active', item.dataset.tab === tab)
    );
  }

  _updateSection(tab) {
    this.sections.forEach(sec => {
      const isActive = sec.id === tab;
      sec.classList.toggle('active', isActive);
      sec.style.display = isActive ? '' : 'none';
    });
    if (this.wrapper) this.wrapper.scrollTop = 0;
    this._unloadIframe(tab);
  }

  _unloadIframe(tab) {
    const iframe = document.querySelector('#error iframe');
    if (!iframe) return;
    if (iframe.src && tab !== 'error') {
      iframe.dataset.src = iframe.src;
      iframe.src = '';
    }
  }

  _onResize() {
    const newZone = this._getZone();
    if (newZone === this.prevZone) return;

    // disable scrollSpy during resize
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

    // re-enable scrollSpy after forced scroll
    setTimeout(() => {
      this.isManualScroll = false;
      this.scrollSpyEnabled = true;
    }, 600);
  }

  _switchMode(NavClass, startTab) {
    this.destroy();
    const instance = new NavClass(this.breakpoint, startTab);
    window.navigatorInstance = instance;

    if (instance instanceof MobileNavigator) {
      instance.isManualScroll = true;
      instance._scrollTo(instance.currentTab);
    }
  }

  _prepareWrapper() {}
  _onNavClick(evt) {}

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

  _onScrollTopClick() {}
}

export class DesktopNavigator extends BaseNavigator {
  _start() {
    if (!document.getElementById(this.currentTab)) {
      this.currentTab = 'error';
      history.replaceState(null, '', `#${this.currentTab}`);
    }
    super._updateNav(this.currentTab);
    super._updateSection(this.currentTab);
  }

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
      this._fadeInSection(tab);
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

  _fadeInSection(tab) {
    const sec = document.getElementById(tab);
    if (!sec) return;
    sec.removeAttribute('data-fading');
    sec.childNodes.forEach((el, i) => el.style?.setProperty('--fade-delay', `${i * 50}ms`));
    void sec.offsetWidth;
    sec.setAttribute('data-fading', '');
  }
}

export class MobileNavigator extends BaseNavigator {
  _prepareWrapper() {
    document.body.classList.add('js-ready');

    if (this.currentTab && !this.isManualScroll && window.location.hash) {
      this.isManualScroll = true;
      this._activateTab(this.currentTab)
    }
    
    ['wheel', 'touchstart'].forEach(evt => window.addEventListener(evt, () => this.isManualScroll = false, { passive: true }));
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
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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
