// i18n.js — 공통 번역 문자열 및 언어 전환 유틸리티

export const t = {
    ko: {
        // 내비게이션
        btn_signin: '로그인', btn_signout: '로그아웃',
        btn_mypage: '마이페이지', btn_community: '커뮤니티', btn_notice: '공지사항',
        // 인증 모달
        tab_signin: '로그인', tab_signup: '회원가입',
        btn_google: 'Google로 계속하기', btn_signup: '회원가입', or_divider: '또는',
        // 푸터
        footer_generate: '도안 만들기', footer_mypage: '내 도안',
        footer_community: '커뮤니티', footer_about: '소개',
        footer_privacy: '개인정보처리방침', footer_guide: '이용안내', footer_terms: '이용약관',
        // 커뮤니티
        tagline_community: '커뮤니티', btn_write: '글쓰기',
        tag_all: '전체', tag_crochet: '코바늘', tag_knitting: '대바늘',
        tag_finished: '완성작', tag_wip: '진행중', tag_question: '질문',
        feed_loading: '불러오는 중...', feed_empty: '게시글이 없습니다. 첫 글을 작성해보세요!', load_more: '더 보기',
    },
    en: {
        btn_signin: 'Sign In', btn_signout: 'Sign Out',
        btn_mypage: 'My Page', btn_community: 'Community', btn_notice: 'Notice',
        tab_signin: 'Sign In', tab_signup: 'Sign Up',
        btn_google: 'Continue with Google', btn_signup: 'Sign Up', or_divider: 'or',
        footer_generate: 'Create Pattern', footer_mypage: 'My Patterns',
        footer_community: 'Community', footer_about: 'About',
        footer_privacy: 'Privacy Policy', footer_guide: 'Guide', footer_terms: 'Terms of Service',
        tagline_community: 'Community', btn_write: 'Write',
        tag_all: 'All', tag_crochet: 'Crochet', tag_knitting: 'Knitting',
        tag_finished: 'Finished', tag_wip: 'WIP', tag_question: 'Q&A',
        feed_loading: 'Loading...', feed_empty: 'No posts yet. Be the first to write!', load_more: 'Load More',
    },
    ja: {
        btn_signin: 'ログイン', btn_signout: 'ログアウト',
        btn_mypage: 'マイページ', btn_community: 'コミュニティ', btn_notice: 'お知らせ',
        tab_signin: 'ログイン', tab_signup: '新規登録',
        btn_google: 'Googleで続ける', btn_signup: '新規登録', or_divider: 'または',
        footer_generate: '編み図を作る', footer_mypage: 'マイ編み図',
        footer_community: 'コミュニティ', footer_about: '紹介',
        footer_privacy: 'プライバシーポリシー', footer_guide: 'ご利用案内', footer_terms: '利用規約',
        tagline_community: 'コミュニティ', btn_write: '投稿する',
        tag_all: 'すべて', tag_crochet: 'かぎ針', tag_knitting: '棒針',
        tag_finished: '完成作品', tag_wip: '制作中', tag_question: '質問',
        feed_loading: '読み込み中...', feed_empty: '投稿がありません。最初の投稿をしてみましょう！', load_more: 'もっと見る',
    }
};

/**
 * 언어를 페이지 전체에 적용합니다.
 * @param {string} lang - 'ko' | 'en' | 'ja'
 * @param {{ pageTitles?: Record<string,string>, extra?: Record<string, Record<string,string>> }} [opts]
 */
export function applyLang(lang, opts = {}) {
    const { pageTitles, extra } = opts;

    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;

    // 언어 버튼 활성화
    document.querySelectorAll('.lang-btn[data-lang]').forEach(b =>
        b.classList.toggle('active', b.getAttribute('data-lang') === lang));

    // 페이지 타이틀
    if (pageTitles)
        document.title = (pageTitles[lang] || pageTitles.ko) + ' | SSUESSUE KNITS';

    // data-ko/en/ja + .i18n 패턴
    document.querySelectorAll('.i18n').forEach(el => {
        const val = el.getAttribute('data-' + lang);
        if (val) el.textContent = val;
    });

    // data-i18n 패턴 (공통 + 페이지별 병합)
    const merged = { ...t[lang], ...(extra?.[lang] ?? {}) };
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (merged[key] !== undefined) el.textContent = merged[key];
    });

    // data-lang-section 블록 전환
    document.querySelectorAll('[data-lang-section]').forEach(el => {
        el.style.display = el.getAttribute('data-lang-section') === lang ? 'block' : 'none';
    });
}

/**
 * 언어 전환 버튼 이벤트를 등록하고 저장된 언어를 즉시 적용합니다.
 * @param {{ pageTitles?: Record<string,string>, extra?: Record<string, Record<string,string>> }} [opts]
 */
export function initLang(opts = {}) {
    const handler = lang => applyLang(lang, opts);
    document.querySelectorAll('.lang-btn[data-lang]').forEach(btn =>
        btn.addEventListener('click', () => handler(btn.getAttribute('data-lang'))));
    const saved = localStorage.getItem('lang');
    if (saved) {
        handler(saved);
    } else {
        // 첫 방문: 브라우저 언어 자동 감지
        const browser = (navigator.language || 'ko').toLowerCase();
        const detected = browser.startsWith('ja') ? 'ja'
                       : browser.startsWith('ko') ? 'ko'
                       : 'en'; // 그 외 모든 언어 → 영어
        handler(detected);
    }
}
