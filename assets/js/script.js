$(function() {
  var $navItems = $('nav ul li');
  var $sections = $('article section');
  function activateTab(tab) {
    if (!tab) return;
    var $targetSection = $('#' + tab);
    var $targetNavItem = $navItems.filter('[data-tab="' + tab + '"]');
    if ($targetSection.length && $targetNavItem.length) {
      $navItems.removeClass('active');
      $targetNavItem.addClass('active');
      $sections.removeClass('active');
      $targetSection.addClass('active');
      window.location.hash = tab;
      $('html, body').scrollTop(0);
    }
  }
  $navItems.on('click', function() {
    var tab = $(this).data('tab');
    activateTab(tab);
  });
  var initialHash = window.location.hash.replace('#', '');
  if (initialHash) {
    activateTab(initialHash);
  } else {
    var defaultTab = $navItems.first().data('tab');
    activateTab(defaultTab);
  }
  $('body').addClass('js-ready');
});
