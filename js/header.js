(function () {

  /* ── 인앱 브라우저 감지 & 안내 배너 ── */
  (function () {
    var ua = navigator.userAgent || '';
    var isInApp = /Instagram|FBAN|FBAV|KAKAOTALK|Line\/|Twitter\/|NAVER/i.test(ua);
    if (!isInApp) return;

    var lang = (function () { try { return localStorage.getItem('ssuessue_lang') || 'ko'; } catch (e) { return 'ko'; } })();
    var dismissed = (function () { try { return sessionStorage.getItem('inapp_banner_dismissed') === '1'; } catch (e) { return false; } })();
    if (dismissed) return;

    var appName = /Instagram/i.test(ua) ? '인스타그램' : /FBAN|FBAV/i.test(ua) ? '페이스북' : /KAKAOTALK/i.test(ua) ? '카카오톡' : /Line\//i.test(ua) ? '라인' : /NAVER/i.test(ua) ? '네이버 앱' : '앱';
    var appNameEn = /Instagram/i.test(ua) ? 'Instagram' : /FBAN|FBAV/i.test(ua) ? 'Facebook' : /KAKAOTALK/i.test(ua) ? 'KakaoTalk' : /Line\//i.test(ua) ? 'Line' : /NAVER/i.test(ua) ? 'Naver App' : 'this app';

    var msgs = {
      ko: {
        title: appName + ' 내부 브라우저에서는 로그인이 작동하지 않아요.',
        guide: '우하단 <b>···</b> 버튼 → <b>Safari로 열기</b> 를 눌러주세요.',
        copy: '링크 복사',
        copied: '복사됨!',
        dismiss: '그냥 볼게요'
      },
      en: {
        title: 'Login doesn\'t work in the ' + appNameEn + ' browser.',
        guide: 'Tap <b>···</b> at the bottom right → <b>Open in Safari / Chrome</b>.',
        copy: 'Copy link',
        copied: 'Copied!',
        dismiss: 'Continue anyway'
      },
      ja: {
        title: appNameEn + ' のブラウザではログインできません。',
        guide: '右下の <b>···</b> → <b>Safariで開く</b> をタップしてください。',
        copy: 'リンクをコピー',
        copied: 'コピー済み!',
        dismiss: 'このまま続ける'
      }
    };
    var m = msgs[lang] || msgs.ko;

    var banner = document.createElement('div');
    banner.id = 'inapp-banner';
    banner.style.cssText = 'background:#1a1a1a;color:#fff;padding:14px 16px 12px;text-align:center;font-family:sans-serif;font-size:13px;line-height:1.6;position:relative;z-index:2000;';
    banner.innerHTML =
      '<div style="max-width:520px;margin:0 auto;">' +
        '<div style="font-weight:700;margin-bottom:4px;font-size:14px;">⚠ ' + m.title + '</div>' +
        '<div style="opacity:.85;margin-bottom:10px;">' + m.guide + '</div>' +
        '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">' +
          '<button id="inapp-copy-btn" style="background:#fff;color:#000;border:none;padding:7px 18px;font-size:12px;font-weight:700;cursor:pointer;border-radius:2px;font-family:inherit;">' + m.copy + '</button>' +
          '<button id="inapp-dismiss-btn" style="background:transparent;color:#aaa;border:1px solid #555;padding:7px 14px;font-size:12px;cursor:pointer;border-radius:2px;font-family:inherit;">' + m.dismiss + '</button>' +
        '</div>' +
      '</div>';

    document.body.insertAdjacentElement('afterbegin', banner);

    document.getElementById('inapp-copy-btn').addEventListener('click', function () {
      try {
        navigator.clipboard.writeText(window.location.href).then(function () {
          document.getElementById('inapp-copy-btn').textContent = m.copied;
        });
      } catch (e) {
        var ta = document.createElement('textarea');
        ta.value = window.location.href;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        document.getElementById('inapp-copy-btn').textContent = m.copied;
      }
    });

    document.getElementById('inapp-dismiss-btn').addEventListener('click', function () {
      try { sessionStorage.setItem('inapp_banner_dismissed', '1'); } catch (e) {}
      banner.style.display = 'none';
    });
  })();

  const headerHtml = `
  <header>
    <div class="hdr-inner">
      <a href="/" class="hdr-logo">SSUESSUE KNITS<span class="hdr-logo-kr">쓔쓔닛츠</span></a>
      <nav class="gnb">
        <div class="gnb-item gnb-has-sub">
          <a class="gnb-link" href="/tools.html">
            <span class="i18n" data-ko="도구" data-en="Tools" data-ja="ツール">도구</span>
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

  /* ── GNB dropdown parent ── */
  var isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  document.querySelectorAll('.gnb-has-sub > .gnb-link').forEach(function (el) {
    el.addEventListener('click', function (e) {
      var sub = el.nextElementSibling;
      if (e.target.closest('.gnb-chevron')) {
        // chevron 클릭: 항상 드롭다운 토글
        e.preventDefault();
        if (sub) sub.classList.toggle('open');
      } else if (isTouchDevice) {
        // 터치 기기에서 링크 텍스트 tap: 서브메뉴가 닫혀 있으면 열고, 이미 열려 있으면 페이지 이동
        if (sub && !sub.classList.contains('open')) {
          e.preventDefault();
          sub.classList.add('open');
        }
        // 이미 열려 있으면 기본 href 이동 허용
      }
      // 데스크탑: 텍스트 클릭 시 그대로 페이지 이동
    });
  });
  // 드롭다운 외부 클릭 시 닫기
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.gnb-has-sub')) {
      document.querySelectorAll('.gnb-sub').forEach(function(sub) {
        sub.classList.remove('open');
      });
    }
  });

  /* ── Breadcrumbs Generator ── */
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const urlUid = params.get('uid');

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
        'tools': { ko: '뜨개 도구 모음', en: 'Knitting Tools', ja: '編み物ツール' },
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
        let finalLabel = labels[label];
        // uid 파라미터가 있으면 "내 프로젝트", "마이페이지" 대신 일반 명칭 사용
        if (urlUid) {
          if (label === 'mypage') finalLabel = { ko: '프로필', en: 'Profile', ja: 'プロフィール' };
          if (label === 'projects') finalLabel = { ko: '프로젝트', en: 'Projects', ja: 'プロジェクト' };
        }
        if (isLast) {
          li.innerHTML = `<span class="current i18n" data-ko="${finalLabel.ko}" data-en="${finalLabel.en}" data-ja="${finalLabel.ja}">${finalLabel.en}</span>`;
        } else {
          li.innerHTML = `<a href="${currentPath}.html" class="i18n" data-ko="${finalLabel.ko}" data-en="${finalLabel.en}" data-ja="${finalLabel.ja}">${finalLabel.en}</a>`;
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

  /* ── Navigation Active State ── */
  const cleanPath = (path === '/index.html' || path === '/') ? '/' : path;
  document.querySelectorAll('.gnb-link, .auth-user .lang-btn').forEach(link => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      
      const cleanHref = (href === '/index.html' || href === '/') ? '/' : href;
      if (cleanPath === cleanHref) {
          // 타인 페이지 조회 시에는 GNB의 "내 프로젝트"나 헤더의 "마이페이지"를 활성화하지 않음
          if (urlUid && (cleanHref === '/mypage.html' || cleanHref === '/projects.html')) {
              return;
          }
          link.classList.add('active');
      }
  });

})();
