const NAVIGATOR_SELECTORS = {
  navItems:     'nav ul li[data-tab]', // Navigation items
  sections:     'article section',     // Content sections to toggle
  wrapper:      'article',             // Wrapper for content sections
  scrollTopBtn: '#scrollTopBtn',       // "Back to top" button
};

const NAVIGATOR_BREAKPOINT = 1100;               // Width threshold for switching to desktop mode
const NAVIGATOR_SHOW_SCROLL_AFTER = 100;         // Scroll offset after which scroll-top appears
const NAVIGATOR_SCROLL_THROTTLE_MS = 50;         // Minimum delay between scroll events

/**
 * Utility: throttle function execution
 */
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

/**
 * Base class for shared navigation behavior (desktop/tablet/mobile)
 */
class BaseNavigator {
  constructor(breakpoint) {
    this.breakpoint = breakpoint;
    this.navItems   = [...document.querySelectorAll(NAVIGATOR_SELECTORS.navItems)];
    this.sections   = [...document.querySelectorAll(NAVIGATOR_SELECTORS.sections)];
    this.wrapper    = document.querySelector(NAVIGATOR_SELECTORS.wrapper);
    this.scrollTopBtn = document.querySelector(NAVIGATOR_SELECTORS.scrollTopBtn);
    this.navEl      = document.querySelector('nav');
    this.navHeight  = this.navEl?.offsetHeight || 0;
    this.currentTab = this._initialTab();
    this.prevZone   = window.innerWidth > NAVIGATOR_BREAKPOINT ? 'desktop' : (window.innerWidth > 655 ? 'tablet' : 'mobile');

    this._bindCommon();
    this._prepareWrapper();
    this._start();
  }

  /**
   * Cleanup event listeners before switching mode
   */
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

  /**
   * Get initial active tab from hash or default to the first item
   */
  _initialTab() {
    const hash = window.location.hash.slice(1);
    return hash || this.navItems[0]?.dataset.tab;
  }

  /**
   * Attach common events (click, resize, scroll)
   */
  _bindCommon() {
    this._onNavClickBound = e => this._onNavClick(e);
    this._onResizeBound   = () => this._onResize();
    this._scrollSpyBound  = throttle(() => this._onScrollSpy(), NAVIGATOR_SCROLL_THROTTLE_MS);
    this._toggleScrollBound = () =>
      this.scrollTopBtn?.classList.toggle('show', window.pageYOffset > NAVIGATOR_SHOW_SCROLL_AFTER);
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

  /**
   * Activate current tab and section on load
   */
  _start() {
    this._updateNav(this.currentTab);
    this._updateSection(this.currentTab);
  }

  /**
   * Update visual state of navigation
   */
  _updateNav(tab) {
    this.navItems.forEach(item =>
      item.classList.toggle('active', item.dataset.tab === tab)
    );
  }

  /**
   * Show selected section and hide others
   */
  _updateSection(tab) {
    this.sections.forEach(sec => {
      const active = sec.id === tab;
      sec.classList.toggle('active', active);
      sec.style.display = active ? '' : 'none';
    });
    if (this.wrapper) this.wrapper.scrollTop = 0;
  }

  _prepareWrapper() {}
  _onNavClick(evt) {}

  /**
   * Handle responsive layout switching on resize
   */
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

  /**
   * Switch navigation mode (desktop/mobile)
   */
  _switchMode(NavClass, scrollToTab) {
    this.destroy();
    navigatorInstance = new NavClass(this.breakpoint);
    if (scrollToTab && navigatorInstance instanceof MobileNavigator) {
      navigatorInstance.isManualScroll = true;
      navigatorInstance._scrollTo(this.currentTab);
      setTimeout(() => {
        navigatorInstance.isManualScroll = false;
      }, 500);
    }
    navigatorInstance._updateNav(this.currentTab);
    navigatorInstance._updateSection(this.currentTab);
  }

  _onScrollSpy() {}
  _onScrollTopClick() {}
}

/**
 * Desktop-specific behavior: transitions between sections
 */
class DesktopNavigator extends BaseNavigator {
  /**
   * Initialize wrapper animation for desktop
   */
  _prepareWrapper() {
    document.body.classList.add('js-ready');
    this.wrapper.classList.add('initial-hide');

    setTimeout(() => {
      this.wrapper.classList.remove('initial-hide');
      this.wrapper.classList.add('slide-in');
      this.wrapper.addEventListener('transitionend', () => {
        this.wrapper.classList.remove('slide-in');
      }, { once: true });
      this.isAnimating = false;
    }, 100);
  }

  /**
   * Handle click on navigation item
   */
  _onNavClick(evt) {
    evt.preventDefault();
    const tab = evt.currentTarget.dataset.tab;
    if (tab === this.currentTab || this.isAnimating) return;
    this._activateTab(tab);
  }

  /**
   * Activate a new tab with transition
   */
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

  /**
   * Start exit animation
   */
  _exit() {
    void this.wrapper.offsetWidth;
    this.wrapper.classList.add('slide-out');
  }

  /**
   * Start enter animation after transition
   */
  _enter() {
    this.wrapper.classList.replace('slide-out', 'slide-in');
    this.wrapper.addEventListener('transitionend', () => {
      this.wrapper.classList.remove('slide-in');
      this.isAnimating = false;
    }, { once: true });
  }
}

/**
 * Mobile-specific behavior: smooth scroll + scroll spy
 */
class MobileNavigator extends BaseNavigator {
  /**
   * Initialize manual scroll tracking for mobile
   */
  _prepareWrapper() {
    document.body.classList.add('js-ready');
    ['wheel','touchstart'].forEach(evt =>
      window.addEventListener(evt, () => this.isManualScroll = false, { passive: true })
    );
    this.isManualScroll = false;
  }

  /**
   * Handle click on navigation item
   */
  _onNavClick(evt) {
    evt.preventDefault();
    const tab = evt.currentTarget.dataset.tab;
    this.isManualScroll = true;
    if (tab === this.currentTab) this._scrollTo(tab);
    else this._activateTab(tab);
  }

  /**
   * Activate tab and scroll to it
   */
  _activateTab(tab) {
    super._updateNav(tab);
    this._scrollTo(tab);
    history.replaceState(null, '', `#${tab}`);
    this.currentTab = tab;
  }

  /**
   * Smooth scroll to section
   */
  _scrollTo(tab) {
    const el = document.getElementById(tab);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Track scroll position to highlight active tab
   */
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

  /**
   * Handle "scroll to top" button click
   */
  _onScrollTopClick() {
    this.isManualScroll = true;
    super._updateNav(this.navItems[0].dataset.tab);
    this.sections.forEach(sec => { sec.classList.remove('active'); sec.style.display='none'; });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    history.replaceState(null, '', window.location.pathname);
    setTimeout(() => this.isManualScroll = false, 500);
  }
}

/**
 * Initialization
 */
let navigatorInstance = null;
window.addEventListener('DOMContentLoaded', () => {
  const isDesktop = window.innerWidth > NAVIGATOR_BREAKPOINT;
  navigatorInstance = new (isDesktop ? DesktopNavigator : MobileNavigator)(NAVIGATOR_BREAKPOINT);
});
