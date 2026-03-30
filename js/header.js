(function () {
  const headerHtml = `
  <header>
    <div class="hdr-inner">
      <a href="/" class="hdr-logo">SSUESSUE KNITS<span class="hdr-logo-kr">쓔쓔닛츠</span></a>
      <nav class="gnb">
        <div class="gnb-item gnb-has-sub">
          <a class="gnb-link" href="#">
            <span class="i18n" data-ko="도구" data-en="Tools" data-ja="ツール">Tools</span>
            <svg class="gnb-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
          </a>
          <div class="gnb-sub">
            <a href="/pattern.html" class="gnb-sub-link i18n" data-ko="도안 생성기" data-en="Pattern Generator" data-ja="編み図ジェネレーター">도안 생성기</a>
            <a href="/toolkit.html" class="gnb-sub-link i18n" data-ko="게이지 계산기" data-en="Gauge Calculator" data-ja="ゲージ計算機">게이지 계산기</a>
            <a href="#" class="gnb-sub-link gnb-counter-btn i18n" data-ko="단수 카운터" data-en="Row Counter" data-ja="段数カウンター">단수 카운터</a>
            <a href="/color-palette.html" class="gnb-sub-link i18n" data-ko="배색 도우미" data-en="Color Palette" data-ja="配色アシスタント">배색 도우미</a>
          </div>
        </div>
        <a class="gnb-item gnb-link i18n" href="/projects.html" data-ko="내 프로젝트" data-en="My Projects" data-ja="プロジェクト">My Projects</a>
        <a class="gnb-item gnb-link i18n" href="/community.html" data-ko="커뮤니티" data-en="Community" data-ja="コミュニティ">Community</a>
        <a class="gnb-item gnb-link i18n" href="/magazine.html" data-ko="매거진" data-en="Magazine" data-ja="マガジン">Magazine</a>
        <a class="gnb-item gnb-link i18n" href="/notice.html" data-ko="공지사항" data-en="Notice" data-ja="お知らせ">Notice</a>
        <a class="gnb-item gnb-link i18n" href="/guide.html" data-ko="이용안내" data-en="Guide" data-ja="ご利用案内">Guide</a>
      </nav>
      <div class="hdr-right">
        <div class="lang-selector">
          <button class="lang-globe-btn" id="langGlobeBtn" aria-label="언어 선택">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </button>
          <div class="lang-dropdown" id="langDropdown">
            <button class="lang-btn active" data-lang="ko">한국어</button>
            <button class="lang-btn" data-lang="en">English</button>
            <button class="lang-btn" data-lang="ja">日本語</button>
          </div>
        </div>
        <button class="lang-btn" id="authSignInBtn" data-i18n="btn_signin">로그인</button>
        <div class="auth-user" id="authUserArea" style="display:none;">
          <span style="display:none;" id="authUserEmail"></span>
          <a href="/mypage.html" class="lang-btn" data-i18n="btn_mypage">마이페이지</a>
          <button class="lang-btn" id="authSignOutBtn" data-i18n="btn_signout">로그아웃</button>
        </div>
      </div>
    </div>
  </header>`;

  // 1. Inject the header right after body tag
  document.body.insertAdjacentHTML('afterbegin', headerHtml);

  // 2. Set up event listeners (moved from hamburger.js)
  
  /* ── Globe language dropdown ── */
  var langGlobeBtn = document.getElementById('langGlobeBtn');
  var langDropdown = document.getElementById('langDropdown');

  if (langGlobeBtn && langDropdown) {
    // Sync active button with stored language
    var storedLang = localStorage.getItem('ssuessue_lang') || 'ko';
    langDropdown.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.lang === storedLang);
    });

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

  /* ── GNB dropdown parent — href="#" 방지 ── */
  document.querySelectorAll('.gnb-has-sub > .gnb-link').forEach(function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); });
  });

  /* ── Breadcrumbs Generator ── */
  const path = window.location.pathname;
  if (path !== '/' && path !== '/index.html') {
    const breadcrumbsContainer = document.createElement('ul');
    breadcrumbsContainer.className = 'breadcrumbs';
    
    // Home
    const homeLi = document.createElement('li');
    homeLi.innerHTML = `<a href="/" class="i18n" data-ko="홈" data-en="Home" data-ja="ホーム">Home</a>`;
    breadcrumbsContainer.appendChild(homeLi);

    // Categories
    const pathParts = path.split('/').filter(p => p);
    let currentPath = '';

    pathParts.forEach((part, index) => {
      currentPath += '/' + part;
      const isLast = index === pathParts.length - 1;
      const li = document.createElement('li');
      
      let label = part.replace('.html', '').replace(/-/g, ' ');
      // Simple mapping for common pages
      const labels = {
        'pattern': { ko: '도안 생성기', en: 'Pattern Generator', ja: '編み図ジェネレーター' },
        'toolkit': { ko: '게이지 계산기', en: 'Gauge Calculator', ja: 'ゲージ計算機' },
        'color-palette': { ko: '배색 도우미', en: 'Color Palette', ja: '配色アシスタント' },
        'projects': { ko: '내 프로젝트', en: 'My Projects', ja: 'プロジェクト' },
        'community': { ko: '커뮤니티', en: 'Community', ja: 'コミュニティ' },
        'magazine': { ko: '매거진', en: 'Magazine', ja: 'マガジン' },
        'notice': { ko: '공지사항', en: 'Notice', ja: 'お知らせ' },
        'guide': { ko: '이용안내', en: 'Guide', ja: 'ご利用案内' },
        'about': { ko: '소개', en: 'About', ja: '紹介' },
        'terms': { ko: '이용약관', en: 'Terms', ja: '利用規約' },
        'privacy': { ko: '개인정보처리방침', en: 'Privacy', ja: 'プライバシーポリシー' },
        'mypage': { ko: '마이페이지', en: 'My Page', ja: 'マイページ' }
      };

      if (labels[label]) {
        if (isLast) {
          li.innerHTML = `<span class="current i18n" data-ko="${labels[label].ko}" data-en="${labels[label].en}" data-ja="${labels[label].ja}">${labels[label].en}</span>`;
        } else {
          li.innerHTML = `<a href="${currentPath}.html" class="i18n" data-ko="${labels[label].ko}" data-en="${labels[label].en}" data-ja="${labels[label].ja}">${labels[label].en}</a>`;
        }
      } else {
        // Fallback for magazine articles or unknowns
        label = label.charAt(0).toUpperCase() + label.slice(1);
        if (isLast) {
          li.innerHTML = `<span class="current">${label}</span>`;
        } else {
          li.innerHTML = `<a href="${currentPath}">${label}</a>`;
        }
      }
      breadcrumbsContainer.appendChild(li);
    });

    document.querySelector('header').insertAdjacentElement('afterend', breadcrumbsContainer);
  }

})();
