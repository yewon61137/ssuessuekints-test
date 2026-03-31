// magazine-lang.js — 매거진 아티클 언어 전환 (독립형)
(function () {
  'use strict';

  var LANGS = ['ko', 'en', 'ja'];

  var NAV_LABELS = {
    ko: { prev: '← 이전 글', next: '다음 글 →', list: '목록으로' },
    en: { prev: '← Prev',    next: 'Next →',     list: 'All Articles' },
    ja: { prev: '← 前の記事', next: '次の記事 →', list: '一覧へ' }
  };

  function applyLang(lang) {
    if (LANGS.indexOf(lang) === -1) lang = 'ko';
    localStorage.setItem('ssuessue_lang', lang);
    document.documentElement.lang = lang;

    // 1. 본문 언어 섹션 전환 (.article-lang[data-lang])
    document.querySelectorAll('.article-lang[data-lang]').forEach(function (el) {
      el.style.display = el.getAttribute('data-lang') === lang ? '' : 'none';
    });

    // 2. data-ko/en/ja 속성 요소 전환
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

    // 4. id 기반 이전/다음/목록 링크 텍스트 업데이트 (older article format)
    var lbl = NAV_LABELS[lang];
    var navPrev = document.getElementById('navPrev');
    var navNext = document.getElementById('navNext');
    var navList = document.getElementById('navList');
    if (navPrev && navPrev.firstElementChild) navPrev.firstElementChild.textContent = lbl.prev;
    if (navNext && navNext.firstElementChild) navNext.firstElementChild.textContent = lbl.next;
    if (navList) navList.textContent = lbl.list;
  }

  // 초기 적용 (DOMContentLoaded — 헤더 주입 후 실행 보장)
  document.addEventListener('DOMContentLoaded', function () {
    var saved = localStorage.getItem('ssuessue_lang') || 'ko';
    applyLang(saved);
  });

  // 언어 버튼 클릭 이벤트 위임 (헤더가 나중에 주입되어도 작동)
  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.lang-btn[data-lang]') : null;
    if (btn) {
      var lang = btn.getAttribute('data-lang');
      if (lang) applyLang(lang);
    }
  });
})();
