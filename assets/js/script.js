$(function() {
  var $navItems = $('nav ul li');
  var $sections = $('article section');
  var $article = $('article');
  var currentTab = null;
  var isAnimating = false;
  function isDesktop() {
    return window.innerWidth > 1100;
  }
  function showSection(tab) {
    $sections.removeClass('active').hide();
    var $target = $('#' + tab);
    $target.show().addClass('active');
    if (isDesktop()) $article.scrollTop(0);
  }
  function activateTab(tab) {
    if (!tab || isAnimating) return;
    isAnimating = true;
    var $targetNav = $navItems.filter('[data-tab="' + tab + '"]');
    if (!$targetNav.length) {
      isAnimating = false;
      return;
    }
    $navItems.removeClass('active');
    $targetNav.addClass('active');
    if (isDesktop()) {
      $article.one('transitionend', function() {
        showSection(tab);
        $article
          .removeClass('slide-out')
          .addClass('slide-in')
          .one('transitionend', function() {
            $article.removeClass('slide-in');
            isAnimating = false;
          });
      });
      $article[0].offsetWidth;
      $article.addClass('slide-out');
    } else {
      showSection(tab);
      isAnimating = false;
    }
    window.location.hash = tab;
    if (isDesktop()) $('html, body').scrollTop(0);
    currentTab = tab;
  }
  var initial = window.location.hash.replace('#', '') || $navItems.first().data('tab');
  currentTab = initial;
  showSection(initial);
  $navItems.removeClass('active');
  $navItems.filter('[data-tab="' + initial + '"]').addClass('active');
  $navItems.on('click', function() {
    var tab = $(this).data('tab');
    if (tab !== currentTab) activateTab(tab);
  });
  var lastDesktop = isDesktop();
  $(window).on('resize', function() {
    var nowDesktop = isDesktop();
    if (nowDesktop !== lastDesktop) {
      $('body').removeClass('js-ready');
      $article.removeClass('slide-out slide-in');
      showSection(currentTab);
      $('body').addClass('js-ready');
      lastDesktop = nowDesktop;
    }
  });
  $('body').addClass('js-ready');
  if (isDesktop()) {
    $article.addClass('slide-in');
    $article.one('transitionend', function() {
      $article.removeClass('slide-in');
    });
  }
});
