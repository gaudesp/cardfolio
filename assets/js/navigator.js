;(function($) {
  'use strict';
  /**
   * Navigator manages switching between sections:
   * - Desktop → slide animations
   * - Mobile  → instant show + scroll/top or section start on reclick
   */
  class Navigator {
    /**
     * @param {Object} config – configuration object
     * @param {string} config.navSelector – selector for nav items
     * @param {string} config.sectionSelector – selector for content sections
     * @param {string} config.wrapperSelector – selector for the scrolling container
     * @param {number} config.desktopBreakpoint – width threshold to consider “desktop”
     * @param {number} config.mobileBreakpoint – width threshold for mobile offset behavior
     */
    constructor({ navSelector, sectionSelector, wrapperSelector, desktopBreakpoint, mobileBreakpoint }) {
      this.$navItems          = $(navSelector);
      this.$sections          = $(sectionSelector);
      this.$wrapper           = $(wrapperSelector);
      this.$root              = $('html, body');
      this.$window            = $(window);
      this.desktopBreakpoint  = desktopBreakpoint;
      this.mobileBreakpoint   = mobileBreakpoint;
      this.currentTab         = null;
      this.isAnimating        = false;
      this.scrollTopBtn       = document.getElementById('scrollTopBtn');
      this.showScrollAfter    = 100;

      this._cacheInitialState();
      this._bindEvents();
      this._start();
    }

    /** true if viewport width > breakpoint */
    _isDesktop() {
      return window.innerWidth > this.desktopBreakpoint;
    }

    /** read URL hash or fallback to first nav item */
    _cacheInitialState() {
      const hash = window.location.hash.slice(1);
      this.initialTab = hash || this.$navItems.first().data('tab');
    }

    /** attach click & resize handlers */
    _bindEvents() {
      this.$navItems.on('click', this._onNavClick.bind(this));
      this.$window.on('resize',  this._onResize.bind(this));

      this._bindScrollListener();
    }

    /** initial render: show section, highlight nav, prep wrapper */
    _start() {
      this.currentTab = this.initialTab;
      this._updateSection(this.currentTab);
      this._updateNav(this.currentTab);
      this._prepareWrapper();
    }

    /** add js-ready class + desktop slide-in */
    _prepareWrapper() {
      $('body').addClass('js-ready');
      if (this._isDesktop()) {
        this.$wrapper
          .addClass('slide-in')
          .one('transitionend', () => this.$wrapper.removeClass('slide-in'));
      }
      this.lastDesktop = this._isDesktop();
    }

    /** nav item clicked */
    _onNavClick(e) {
      e.preventDefault();
      const tab = $(e.currentTarget).data('tab');
      if (tab === this.currentTab) {
        if (!this._isDesktop()) {
          this._handleMobileReclick(tab);
        }
        return;
      }

      this._activateTab(tab);
    }

    /** viewport resized across breakpoint */
    _onResize() {
      const nowDesktop = this._isDesktop();
      if (nowDesktop === this.lastDesktop) return;

      $('body').removeClass('js-ready');
      this.$wrapper.removeClass('slide-in slide-out');
      this._updateSection(this.currentTab);
      $('body').addClass('js-ready');
      this.lastDesktop = nowDesktop;
    }

    /** show/hide the “Scroll to Top” button and handle the click */
    _bindScrollListener() {
      if (!this.scrollTopBtn) return;

      window.addEventListener('scroll', () => {
        if (window.pageYOffset > this.showScrollAfter) {
          this.scrollTopBtn.classList.add('show');
        } else {
          this.scrollTopBtn.classList.remove('show');
        }
      });

      this.scrollTopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    /**
     * show the given section and reset its scroll
     * @param {string} tab
     */
    _updateSection(tab) {
      this.$sections.hide().removeClass('active');
      $(`#${tab}`).show().addClass('active');
      this.$wrapper.scrollTop(0);
    }

    /**
     * highlight the nav item for the given tab
     * @param {string} tab
     */
    _updateNav(tab) {
      this.$navItems
        .removeClass('active')
        .filter(`[data-tab="${tab}"]`)
        .addClass('active');
    }

    /**
     * animate or instantly switch to a new tab
     * @param {string} tab
     */
    _activateTab(tab) {
      if (!tab || this.isAnimating) return;
      this.isAnimating = true;

      const $nav = this.$navItems.filter(`[data-tab="${tab}"]`);
      if (!$nav.length) {
        this.isAnimating = false;
        return;
      }

      this._updateNav(tab);

      if (this._isDesktop()) {
        this.$wrapper
          .one('transitionend', () => {
            this._updateSection(tab);
            this.$wrapper
              .removeClass('slide-out')
              .addClass('slide-in')
              .one('transitionend', () => {
                this.$wrapper.removeClass('slide-in');
                this.isAnimating = false;
              });
          });
        this.$wrapper[0].offsetWidth;
        this.$wrapper.addClass('slide-out');
      } else {
        this._updateSection(tab);
        this.isAnimating = false;
      }

      window.location.hash = tab;
      if (this._isDesktop()) this.$root.scrollTop(0);
      this.currentTab = tab;
    }

    /**
     * on mobile reclick, scroll to top or to section start
     * @param {string} tab
     */
    _handleMobileReclick(tab) {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      const offset = window.innerWidth <= this.mobileBreakpoint ? 59 : 88;
      const el     = document.getElementById(tab);
      if (!el) return;
      const targetY = el.getBoundingClientRect().top + scrollY - offset;
    
      window.scrollTo(0, targetY);
    }
  }

  // init on DOM ready
  $(function() {
    new Navigator({
      navSelector:        'nav ul li',
      sectionSelector:    'article section',
      wrapperSelector:    'article',
      desktopBreakpoint:   1100,
      mobileBreakpoint:    655
    });
  });
})(jQuery);
