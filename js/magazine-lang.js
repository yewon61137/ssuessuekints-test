(function () {
  'use strict';

  var LANGS = ['ko', 'en', 'ja'];
  var NAV_LABELS = {
    ko: { prev: '← 이전 글', next: '다음 글 →', list: '목록으로' },
    en: { prev: '← Previous', next: 'Next →', list: 'All Articles' },
    ja: { prev: '← 前の記事', next: '次の記事 →', list: '一覧へ' }
  };

  var articles = [];
  var fetchStarted = false;
  var fetchDone = false;

  function getSavedLang() {
    try {
      return localStorage.getItem('ssuessue_lang') || 'ko';
    } catch (e) {
      return 'ko';
    }
  }

  function setSavedLang(lang) {
    try {
      localStorage.setItem('ssuessue_lang', lang);
    } catch (e) {}
  }

  function currentSlug() {
    var path = window.location.pathname.replace(/\/$/, '');
    return path.split('/').pop().replace(/\.html$/, '');
  }

  function fetchArticleOrder() {
    if (fetchStarted) return;
    fetchStarted = true;

    fetch('/magazine.html')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        var doc = new DOMParser().parseFromString(text, 'text/html');
        var seen = {};
        articles = Array.prototype.slice.call(doc.querySelectorAll('.article-card[href]'))
          .map(function (link) {
            return link.getAttribute('href').split('/').pop().replace(/\.html$/, '');
          })
          .filter(function (slug) {
            if (!slug || seen[slug]) return false;
            seen[slug] = true;
            return true;
          });
        fetchDone = articles.length > 0;
        buildNav(getSavedLang());
      })
      .catch(function (err) {
        console.error('Failed to load magazine article order:', err);
      });
  }

  function buildNav(lang) {
    var navEl = document.querySelector('.article-nav');
    if (!navEl) return;
    if (!fetchDone) {
      fetchArticleOrder();
      return;
    }

    var idx = articles.indexOf(currentSlug());
    if (idx === -1) return;

    var labels = NAV_LABELS[lang] || NAV_LABELS.ko;
    var prevSlug = idx < articles.length - 1 ? articles[idx + 1] : null;
    var nextSlug = idx > 0 ? articles[idx - 1] : null;

    navEl.innerHTML = '';
    navEl.appendChild(makeNavItem('article-nav-prev', prevSlug, labels.prev));
    navEl.appendChild(makeListItem(labels.list));
    navEl.appendChild(makeNavItem('article-nav-next', nextSlug, labels.next));
  }

  function makeNavItem(className, slug, label) {
    var span = document.createElement('span');
    span.className = className;
    if (slug) {
      var link = document.createElement('a');
      link.href = '/magazine/' + slug + '.html';
      link.textContent = label;
      span.appendChild(link);
    }
    return span;
  }

  function makeListItem(label) {
    var span = document.createElement('span');
    span.className = 'article-nav-center';
    var link = document.createElement('a');
    link.href = '/magazine.html';
    link.textContent = label;
    span.appendChild(link);
    return span;
  }

  function applyLang(lang) {
    if (LANGS.indexOf(lang) === -1) lang = 'ko';
    setSavedLang(lang);
    document.documentElement.lang = lang;

    document.querySelectorAll('.article-lang[data-lang]').forEach(function (el) {
      el.style.display = el.getAttribute('data-lang') === lang ? '' : 'none';
    });

    document.querySelectorAll('[data-ko],[data-en],[data-ja]').forEach(function (el) {
      var val = el.getAttribute('data-' + lang);
      if (val === null) return;
      if (/<[a-zA-Z]/i.test(val) || val.indexOf('&') !== -1) {
        el.innerHTML = val;
      } else {
        el.textContent = val;
      }
    });

    document.querySelectorAll('.lang-btn[data-lang]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });

    buildNav(lang);
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyLang(getSavedLang());
  });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.lang-btn[data-lang]') : null;
    if (btn) applyLang(btn.getAttribute('data-lang'));
  });
})();
