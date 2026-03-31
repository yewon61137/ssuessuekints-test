// magazine-lang.js — 매거진 아티클 언어 전환 + 이전/다음 nav 자동 생성
//
// ★ 새 아티클 추가 시: ARTICLES 배열 맨 끝에 슬러그(파일명에서 .html 제외)를 추가하면 끝.
//   nav(이전/다음/목록)은 자동으로 생성되며, 언어 전환도 즉시 적용됩니다.
//
(function () {
  'use strict';

  // ────────────────────────────────────────────────────────────────────
  // 아티클 목록 — 오래된 글부터 최신 글 순으로 유지 (순서가 이전/다음 결정)
  // 새 글 추가 시 맨 끝에 슬러그 한 줄 추가
  // ────────────────────────────────────────────────────────────────────
  var ARTICLES = [
    'yarn-weight-guide',           // 2026-01-05
    'crochet-vs-knitting',         // 2026-01-15
    'beginners-guide',             // 2026-01-30
    '2026-knitting-trends',        // 2026-02-10
    'yarn-care-guide',             // 2026-02-20
    'amigurumi-beginners',         // 2026-02-28
    'gauge-swatch-guide',          // 2026-03-05
    'crochet-basics',              // 2026-03-10
    'aran-knitting-symbols',       // 2026-03-14
    'sustainable-knitting-slow-fashion', // 2026-03-17
    '2026-crochet-fashion-trends', // 2026-03-20
    'knitting-mental-health',      // 2026-03-24
    'science-of-knitting-physics', // 2026-03-27
    'knitting-history-spy'         // 2026-03-30 ← 현재 최신
    // 예시: 'new-article-slug'   // YYYY-MM-DD
  ];

  var LANGS = ['ko', 'en', 'ja'];

  var NAV_LABELS = {
    ko: { prev: '← 이전 글', next: '다음 글 →', list: '목록으로' },
    en: { prev: '← Prev',    next: 'Next →',     list: 'All Articles' },
    ja: { prev: '← 前の記事', next: '次の記事 →', list: '一覧へ' }
  };

  // URL에서 현재 슬러그 추출
  function currentSlug() {
    var m = window.location.pathname.match(/\/magazine\/([^\/]+)\.html/);
    return m ? m[1] : null;
  }

  // 이전/다음/목록 nav를 현재 위치 기반으로 자동 구성
  function buildNav(lang) {
    var lbl = NAV_LABELS[lang];
    var slug = currentSlug();
    var idx = slug ? ARTICLES.indexOf(slug) : -1;

    var prevSlug = (idx > 0) ? ARTICLES[idx - 1] : null;
    var nextSlug = (idx >= 0 && idx < ARTICLES.length - 1) ? ARTICLES[idx + 1] : null;

    function setSpan(cls, targetSlug, label) {
      var span = document.querySelector('.' + cls);
      if (!span) return;
      if (targetSlug) {
        var a = span.querySelector('a');
        if (!a) {
          a = document.createElement('a');
          span.appendChild(a);
        }
        a.href = '/magazine/' + targetSlug + '.html';
        a.textContent = label;
        // 불필요한 data-* 속성 제거 (이중 처리 방지)
        a.removeAttribute('data-ko');
        a.removeAttribute('data-en');
        a.removeAttribute('data-ja');
      } else {
        span.innerHTML = '';
      }
    }

    setSpan('article-nav-prev', prevSlug, lbl.prev);
    setSpan('article-nav-next', nextSlug, lbl.next);

    var listLink = document.querySelector('.article-nav-center a');
    if (listLink) listLink.textContent = lbl.list;
  }

  function applyLang(lang) {
    if (LANGS.indexOf(lang) === -1) lang = 'ko';
    localStorage.setItem('ssuessue_lang', lang);
    document.documentElement.lang = lang;

    // 1. 본문 언어 섹션 전환 (.article-lang[data-lang])
    document.querySelectorAll('.article-lang[data-lang]').forEach(function (el) {
      el.style.display = el.getAttribute('data-lang') === lang ? '' : 'none';
    });

    // 2. data-ko/en/ja 속성 요소 텍스트 전환
    //    HTML 태그(<br> 등) 또는 엔티티(&nbsp; 등) 포함 시 innerHTML 사용
    document.querySelectorAll('[data-ko],[data-en],[data-ja]').forEach(function (el) {
      var val = el.getAttribute('data-' + lang);
      if (val === null) return;
      if (/<[a-zA-Z]/i.test(val) || val.indexOf('&') !== -1) {
        el.innerHTML = val;
      } else {
        el.textContent = val;
      }
    });

    // 3. 언어 버튼 active 상태 동기화
    document.querySelectorAll('.lang-btn[data-lang]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });

    // 4. 이전/다음/목록 nav 자동 생성 (ARTICLES 배열 기반)
    buildNav(lang);
  }

  // 초기 적용
  document.addEventListener('DOMContentLoaded', function () {
    var saved = localStorage.getItem('ssuessue_lang') || 'ko';
    applyLang(saved);
  });

  // 언어 버튼 클릭 이벤트 위임 (헤더 주입 타이밍 무관)
  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.lang-btn[data-lang]') : null;
    if (btn) {
      var lang = btn.getAttribute('data-lang');
      if (lang) applyLang(lang);
    }
  });
})();
