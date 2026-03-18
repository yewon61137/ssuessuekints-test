(function () {
  document.addEventListener('DOMContentLoaded', function () {

    /* ── Globe language dropdown ── */
    var langGlobeBtn = document.getElementById('langGlobeBtn');
    var langDropdown = document.getElementById('langDropdown');

    if (langGlobeBtn && langDropdown) {
      langGlobeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        langDropdown.classList.toggle('open');
      });

      // Close when a language is selected
      langDropdown.querySelectorAll('.lang-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          langDropdown.classList.remove('open');
        });
      });

      // Close on outside click
      document.addEventListener('click', function () {
        langDropdown.classList.remove('open');
      });

      langDropdown.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    }

    /* ── Hamburger menu ── */
    var hamburgerBtn = document.getElementById('hamburgerBtn');
    var mobileMenu = document.getElementById('mobileMenu');
    var mobileOverlay = document.getElementById('mobileOverlay');
    var mobileMenuClose = document.getElementById('mobileMenuClose');
    var mobileSignInBtn = document.getElementById('mobileSignInBtn');
    var mobileUserArea = document.getElementById('mobileUserArea');
    var mobileNickname = document.getElementById('mobileNickname');
    var mobileSignOutBtn = document.getElementById('mobileSignOutBtn');

    if (!hamburgerBtn || !mobileMenu) return;

    function openMenu() {
      mobileMenu.classList.add('open');
      mobileOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      mobileMenu.classList.remove('open');
      mobileOverlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    hamburgerBtn.addEventListener('click', openMenu);
    if (mobileMenuClose) mobileMenuClose.addEventListener('click', closeMenu);
    mobileOverlay.addEventListener('click', closeMenu);

    mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });

    /* ── Auth state sync ── */
    var desktopSignInBtn = document.getElementById('authSignInBtn');
    var desktopUserArea = document.getElementById('authUserArea');
    var desktopUserEmail = document.getElementById('authUserEmail');
    var desktopSignOutBtn = document.getElementById('authSignOutBtn');

    function syncAuthState() {
      if (!desktopSignInBtn || !desktopUserArea) return;
      var isLoggedIn = desktopUserArea.style.display === 'flex' || desktopUserArea.style.display === 'block';
      if (mobileSignInBtn) mobileSignInBtn.style.display = isLoggedIn ? 'none' : 'block';
      if (mobileUserArea) mobileUserArea.style.display = isLoggedIn ? 'flex' : 'none';
      if (mobileNickname && desktopUserEmail && desktopUserEmail.textContent) {
        mobileNickname.textContent = desktopUserEmail.textContent;
      }
    }

    if (desktopSignInBtn && desktopUserArea) {
      var observer = new MutationObserver(syncAuthState);
      observer.observe(desktopSignInBtn, { attributes: true, attributeFilter: ['style'] });
      observer.observe(desktopUserArea, { attributes: true, attributeFilter: ['style'] });
      syncAuthState();
    }

    if (mobileSignInBtn && desktopSignInBtn) {
      mobileSignInBtn.addEventListener('click', function () {
        closeMenu();
        desktopSignInBtn.click();
      });
    }

    if (mobileSignOutBtn && desktopSignOutBtn) {
      mobileSignOutBtn.addEventListener('click', function () {
        closeMenu();
        desktopSignOutBtn.click();
      });
    }

    /* ── Mobile i18n sync ── */
    function applyMobileLang(lang) {
      document.querySelectorAll('.mobile-i18n').forEach(function (el) {
        var val = el.getAttribute('data-' + lang);
        if (val) el.textContent = val;
      });
    }

    new MutationObserver(function () {
      applyMobileLang(document.documentElement.lang || 'ko');
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

    applyMobileLang(localStorage.getItem('lang') || 'ko');

    /* ── Row counter toggle (header + GNB + mobile menu) ── */
    function toggleCounter(e) {
      e && e.preventDefault();
      var rc = document.querySelector('knitting-row-counter');
      if (rc && typeof rc.toggleDrawer === 'function') rc.toggleDrawer();
    }

    // Header icon button
    var counterToggleBtn = document.getElementById('counterToggle');
    if (counterToggleBtn) counterToggleBtn.addEventListener('click', toggleCounter);

    // GNB dropdown item
    document.querySelectorAll('.gnb-counter-btn').forEach(function (el) {
      el.addEventListener('click', toggleCounter);
    });

    // Mobile menu item
    document.querySelectorAll('.mobile-counter-btn').forEach(function (el) {
      el.addEventListener('click', function (e) {
        closeMenu();
        toggleCounter(e);
      });
    });
  });
})();
