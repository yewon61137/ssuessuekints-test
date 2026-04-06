// cookie-consent.js — 쿠키 동의 배너 (모든 페이지 공통)

(function () {
  if (localStorage.getItem('cookieConsent')) return;

  const t = {
    ko: {
      msg: '이 사이트는 로그인 유지 및 광고 제공을 위해 쿠키를 사용합니다.',
      accept: '동의',
      more: '자세히',
    },
    en: {
      msg: 'This site uses cookies for login sessions and personalized ads.',
      accept: 'Accept',
      more: 'Learn more',
    },
    ja: {
      msg: 'このサイトはログイン維持と広告配信のためにクッキーを使用しています。',
      accept: '同意する',
      more: '詳細',
    },
  };

  function updateBannerHeight() {
    const height = banner.offsetHeight;
    document.documentElement.style.setProperty('--cookie-banner-height', `${height}px`);
  }

  const lang = localStorage.getItem('ssuessue_lang') || 'ko';
  const tx = t[lang] || t.ko;

  const banner = document.createElement('div');
  banner.id = 'cookieBanner';
  banner.innerHTML = `
    <span class="cookie-msg">${tx.msg}</span>
    <div class="cookie-btns">
      <a href="/privacy.html" class="cookie-more">${tx.more}</a>
      <button class="cookie-accept">${tx.accept}</button>
    </div>
  `;
  document.body.appendChild(banner);

  // Initial measurement and observation for resizing
  setTimeout(updateBannerHeight, 100);
  window.addEventListener('resize', updateBannerHeight);

  banner.querySelector('.cookie-accept').addEventListener('click', () => {
    localStorage.setItem('cookieConsent', '1');
    banner.style.transform = 'translateY(100%)';
    document.documentElement.style.setProperty('--cookie-banner-height', '0px');
    window.removeEventListener('resize', updateBannerHeight);
    setTimeout(() => banner.remove(), 300);
  });
})();
