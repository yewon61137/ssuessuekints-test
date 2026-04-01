// magazine-lang.js — 매거진 아티클 언어 전환 + 이전/다음 nav 자동 생성
//
// ★ 새 아티클 추가 시: magazine.html 파일에 카드를 추가하기만 하면
//   nav(이전/다음/목록)은 자동으로 생성되며, 가장 최신 글을 인식하여
//   이전/다음 버튼 노출 여부를 자동 제어합니다.
//
(function () {
  'use strict';

  var ARTICLES = []; // magazine.html에서 동적으로 채워짐 (0번이 가장 최신 글)
  var isNavFetched = false;

  var LANGS = ['ko', 'en', 'ja'];
  var NAV_LABELS = {
    ko: { prev: '← 이전 글', next: '다음 글 →', list: '목록으로' },
    en: { prev: '← Prev',    next: 'Next →',     list: 'All Articles' },
    ja: { prev: '← 前の記事', next: '次の記事 →', list: '一覧へ' }
  };

  function currentSlug() {
    var path = window.location.pathname;
    if (path.endsWith('/')) path = path.slice(0, -1);
    return path.split('/').pop().replace('.html', '');
  }

  var isNavFetching = false;

  function fetchArticlesAndBuildNav() {
    if (isNavFetched || isNavFetching) return;
    isNavFetching = true;
    fetch('/magazine.html')
      .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function(text) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(text, 'text/html');
        var links = doc.querySelectorAll('.article-card');
        var temp = [];
        for (var i = 0; i < links.length; i++) {
          var href = links[i].getAttribute('href');
          if (!href) continue;
          var slugVal = href.split('/').pop().replace('.html', '');
          if (slugVal && temp.indexOf(slugVal) === -1) {
            temp.push(slugVal);
          }
        }
        if (temp.length === 0) {
          // 파싱 결과가 비어 있으면 재시도를 위해 플래그를 올리지 않음
          isNavFetching = false;
          return;
        }
        ARTICLES = temp; // 순서 유지 (가장 최신글 0번)
        isNavFetched = true;
        isNavFetching = false;
        var saved = localStorage.getItem('ssuessue_lang') || 'ko';
        buildNav(saved);
      })
      .catch(function(e) {
        console.error('Failed to fetch magazine list', e);
        isNavFetching = false;
      });
  }

  function buildNav(lang) {
    if (!isNavFetched) {
      // 아직 안 불렀으면 패치 시작
      fetchArticlesAndBuildNav();
      return;
    }

    var lbl = NAV_LABELS[lang] || NAV_LABELS['ko'];
    var slug = currentSlug();
    var idx = slug ? ARTICLES.indexOf(slug) : -1;

    var navEl = document.querySelector('.article-nav');
    if (!navEl) return;

    // 슬러그 매칭 실패 시 기존 하드코딩된 nav 유지 (빈 nav로 덮어쓰지 않음)
    if (idx === -1) return;

    // 이전/다음 글 결정 (magazine.html에서 나열된 순서는 "최신 -> 과거" 순)
    // 따라서 "이전 글(과거)"은 배열에서 나보다 뒤에 있는 글 (idx + 1)
    // "다음 글(최신)"은 배열에서 나보다 앞에 있는 글 (idx - 1)
    var prevSlug = (idx >= 0 && idx < ARTICLES.length - 1) ? ARTICLES[idx + 1] : null;
    var nextSlug = (idx > 0) ? ARTICLES[idx - 1] : null;

    navEl.innerHTML = '';

    // ← 이전 글 (과거)
    var prevSpan = document.createElement('span');
    prevSpan.className = 'article-nav-prev';
    if (prevSlug) {
      var prevA = document.createElement('a');
      prevA.href = '/magazine/' + prevSlug + '.html';
      prevA.textContent = lbl.prev;
      prevSpan.appendChild(prevA);
    }
    navEl.appendChild(prevSpan);

    // 목록으로
    var centerSpan = document.createElement('span');
    centerSpan.className = 'article-nav-center';
    var listA = document.createElement('a');
    listA.href = '/magazine.html';
    listA.textContent = lbl.list;
    centerSpan.appendChild(listA);
    navEl.appendChild(centerSpan);

    // 다음 글 → (최신)
    var nextSpan = document.createElement('span');
    nextSpan.className = 'article-nav-next';
    if (nextSlug) {
      var nextA = document.createElement('a');
      nextA.href = '/magazine/' + nextSlug + '.html';
      nextA.textContent = lbl.next;
      nextSpan.appendChild(nextA);
    }
    navEl.appendChild(nextSpan);
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
