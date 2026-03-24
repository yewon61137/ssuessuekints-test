// home.js — 홈페이지 JS (index.html)
import { auth, db, initAuth } from './auth.js';
import { initLang, applyLang } from './i18n.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
    collection, query, where, orderBy, limit, getDocs
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// ── Lang select helper (레거시, 기존 select 사용 페이지 호환) ──
window._applyLangFromSelect = function(val) {
    const allowed = ['ko', 'en', 'ja'];
    const lang = allowed.includes(val) ? val : 'ko';
    applyLang(lang, { pageTitles: PAGE_TITLES });
};

const PAGE_TITLES = { ko: '홈', en: 'Home', ja: 'ホーム' };

// ── Magazine static data ──────────────────────────────────────
const MAGAZINE_ARTICLES = [
    {
        href: '/magazine/crochet-basics.html',
        cat: { ko: '코바늘 기법', en: 'Crochet Techniques', ja: 'かぎ針技法' },
        title: { ko: '코바늘 기초 기법 완전 정리', en: 'Complete Guide to Basic Crochet Stitches', ja: 'かぎ針基本技法完全ガイド' },
        date: { ko: '2026년 3월 12일', en: 'March 12, 2026', ja: '2026年3月12日' },
    },
    {
        href: '/magazine/gauge-swatch-guide.html',
        cat: { ko: '기법 · 테크닉', en: 'Technique', ja: 'テクニック' },
        title: { ko: '게이지 스와치 완벽 가이드', en: 'The Complete Gauge Swatch Guide', ja: 'ゲージスウォッチ完全ガイド' },
        date: { ko: '2026년 3월 5일', en: 'March 5, 2026', ja: '2026年3月5日' },
    },
    {
        href: '/magazine/amigurumi-beginners.html',
        cat: { ko: '코바늘 기법', en: 'Crochet Techniques', ja: 'かぎ針技法' },
        title: { ko: '아미구루미 입문 가이드', en: "Amigurumi Beginner's Guide", ja: 'アミグルミ入門ガイド' },
        date: { ko: '2026년 2월 25일', en: 'February 25, 2026', ja: '2026年2月25日' },
    },
];

// ── Read more label ───────────────────────────────────────────
const READ_MORE = { ko: '읽기 →', en: 'Read →', ja: '読む →' };

function renderMagazine(lang) {
    const el = document.getElementById('magazineList');
    if (!el) return;
    const l = ['ko', 'en', 'ja'].includes(lang) ? lang : 'ko';
    el.innerHTML = MAGAZINE_ARTICLES.map(a => `
        <a class="mag-item" href="${a.href}">
            <span class="mag-cat">${a.cat[l]}</span>
            <div class="mag-title">${a.title[l]}</div>
            <div class="mag-meta">
                <span>${a.date[l]}</span>
                <span>${READ_MORE[l]}</span>
            </div>
        </a>`).join('');
}


// ── Projects (Firestore) ──────────────────────────────────────
const PROJ_CTA = {
    title: {
        ko: '지금 뜨고 있는 작품이 있나요?',
        en: 'Are you knitting something right now?',
        ja: '今編んでいる作品はありますか？'
    },
    desc: {
        ko: '프로젝트를 만들어 진행상황을 기록해보세요',
        en: 'Create a project and track your progress',
        ja: 'プロジェクトを作って進捗を記録しましょう'
    },
    btn: {
        ko: '프로젝트 시작하기 →',
        en: 'Start a Project →',
        ja: 'プロジェクトを始める →'
    }
};

async function loadProjects(isLoggedIn = false, uid = null) {
    const listEl = document.getElementById('projectList');
    const cntEl  = document.getElementById('projectCount');
    if (!listEl) return;

    const lang = document.documentElement.lang || 'ko';

    // 비로그인 상태
    if (!isLoggedIn || !uid) {
        listEl.innerHTML = `
            <div class="home-empty" style="padding:1.5rem 1rem;background:#fdfaf5;border:1.5px solid #000;text-align:center;display:flex;flex-direction:column;align-items:center;gap:0.75rem;">
                <div style="font-size:0.9rem;font-weight:800;font-family:'GmarketSans',sans-serif;">${PROJ_CTA.title[lang]}</div>
                <div style="font-size:0.75rem;color:#666;line-height:1.4;">${PROJ_CTA.desc[lang]}</div>
                <a href="/projects.html" class="primary-btn small-btn" style="width:auto;margin-top:0.2rem;font-size:0.75rem;padding:0.6rem 1.2rem;text-decoration:none;">${PROJ_CTA.btn[lang]}</a>
            </div>`;
        if (cntEl) cntEl.textContent = '0';
        return;
    }

    // Firestore에서 프로젝트 목록 조회
    try {
        const snap = await getDocs(
            query(collection(db, 'users', uid, 'projects'), orderBy('createdAt', 'desc'))
        );

        // 각 프로젝트의 파트 상태 수집
        const projects = await Promise.all(snap.docs.map(async d => {
            const proj = { id: d.id, ...d.data() };
            try {
                const partsSnap = await getDocs(
                    collection(db, 'users', uid, 'projects', d.id, 'parts')
                );
                const parts = partsSnap.docs.map(pd => pd.data());
                const doneParts = parts.filter(p => p.status === 'done').length;
                proj._totalParts = parts.length;
                proj._doneParts  = doneParts;
                proj._pct        = parts.length > 0 ? Math.round(doneParts / parts.length * 100) : 0;
                // 상태 계산
                if (parts.every(p => p.status === 'done') && parts.length > 0) proj._status = 'done';
                else if (parts.some(p => p.status === 'inProgress')) proj._status = 'inProgress';
                else proj._status = 'pending';
                // 진행중인 파트명
                const inProgressPart = parts.find(p => p.status === 'inProgress');
                proj._currentPart = inProgressPart?.title || '';
            } catch {
                proj._totalParts = 0; proj._doneParts = 0; proj._pct = 0;
                proj._status = 'pending'; proj._currentPart = '';
            }
            return proj;
        }));

        if (cntEl) cntEl.textContent = projects.length;

        if (projects.length === 0) {
            listEl.innerHTML = `
                <div class="home-empty">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ddd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    <span>${PROJ_CTA.btn[lang]}</span>
                </div>`;
            return;
        }

        // 진행중 우선 정렬
        const order = { inProgress: 0, pending: 1, done: 2 };
        projects.sort((a, b) => (order[a._status] ?? 1) - (order[b._status] ?? 1));

        listEl.innerHTML = projects.slice(0, 4).map(p => {
            const statusLabel = p._status === 'done'
                ? (lang === 'ko' ? '완성' : lang === 'ja' ? '完成' : 'Done')
                : p._status === 'inProgress'
                ? (lang === 'ko' ? '진행중' : lang === 'ja' ? '進行中' : 'In Progress')
                : (lang === 'ko' ? '시작전' : lang === 'ja' ? '未開始' : 'Planned');
            const statusClass = p._status === 'done' ? 'color:#2e7d32'
                : p._status === 'inProgress' ? 'color:#1a73e8' : 'color:#888';
            return `
            <div class="proj-item" onclick="location.href='/projects.html'" style="cursor:pointer;">
                <div class="proj-info">
                    <div class="proj-name">${String(p.title || '').substring(0, 30)}</div>
                    ${p._currentPart ? `<div class="proj-rows" style="font-size:0.72rem;color:#888;">${p._currentPart}</div>` : ''}
                    ${p._totalParts > 0 ? `<div class="proj-bar-wrap"><div class="proj-bar-fill" style="width:${p._pct}%;"></div></div>` : ''}
                </div>
                <div class="proj-count" style="${statusClass};font-size:0.7rem;font-weight:800;">${statusLabel}</div>
            </div>`;
        }).join('');

    } catch (e) {
        console.error('loadProjects error:', e);
        if (cntEl) cntEl.textContent = '0';
    }
}


// ── Community panel title ─────────────────────────────────────
const T_COMM = {
    latest: { ko: '최신 게시글', en: 'Latest Posts', ja: '最新の投稿' },
    mine:   { ko: '최근 완성작', en: 'My Recent Work', ja: '最近の完成作品' }
};

function updateCommunityTitle(uid, lang) {
    const l = ['ko', 'en', 'ja'].includes(lang) ? lang : 'ko';
    const ttlEl = document.querySelector('.home-panel:first-child .home-panel-ttl');
    if (ttlEl) ttlEl.textContent = uid ? T_COMM.mine[l] : T_COMM.latest[l];
}

// ── Community posts (Firestore) ───────────────────────────────
async function loadCommunityPosts(uid = null) {
    const el = document.getElementById('communityGrid');
    if (!el) return;

    const lang = document.documentElement.lang || 'ko';
    updateCommunityTitle(uid, lang);

    try {
        let q;
        if (uid) {
            // 로그인 상태: 내 완성작 (태그가 finished인 내 글)
            q = query(
                collection(db, 'posts'),
                where('userId', '==', uid),
                where('tags', 'array-contains', 'finished'),
                orderBy('createdAt', 'desc'),
                limit(3)
            );
        } else {
            // 비로그인 상태: 전체 최신글 3개
            q = query(
                collection(db, 'posts'),
                orderBy('createdAt', 'desc'),
                limit(3)
            );
        }

        const snap = await getDocs(q);
        if (snap.empty) {
            el.innerHTML = `<div class="home-empty" style="grid-column: span 3; color:#bbb; font-size:0.7rem; padding: 2rem 0;">${lang === 'ko' ? '게시글이 없습니다.' : lang === 'ja' ? '投稿がありません。' : 'No posts found.'}</div>`;
            return;
        }

        const items = [];
        snap.forEach(doc => {
            const d = doc.data();
            const imgUrl = (d.images && d.images[0]) || '';
            const nick = d.nickname ? String(d.nickname).substring(0, 20) : '익명';
            const title = d.title ? String(d.title).substring(0, 40) : '';
            items.push({ id: doc.id, imgUrl, nick, title });
        });
        el.innerHTML = items.map(p => `
            <a class="cg-item" href="/post.html?id=${encodeURIComponent(p.id)}">
                <div class="cg-thumb">
                    ${p.imgUrl
                        ? `<img src="${p.imgUrl}" alt="" loading="lazy">`
                        : `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`}
                </div>
                <div class="cg-name">${p.title}</div>
                <div class="cg-meta">${p.nick}</div>
            </a>`).join('');
    } catch (e) {
        console.warn('loadCommunityPosts:', e.message);
    }
}

// ── Greeting ──────────────────────────────────────────────────
const GREETING = {
    ko: name => name ? `${name}님, 안녕하세요 👋` : '안녕하세요 👋',
    en: name => name ? `Hello, ${name} 👋` : 'Hello there 👋',
    ja: name => name ? `${name}さん、こんにちは 👋` : 'こんにちは 👋',
};

function updateGreeting(nickname) {
    const el = document.getElementById('greetingTitle');
    if (!el) return;
    const lang = document.documentElement.lang || 'ko';
    const fn = GREETING[lang] || GREETING.ko;
    el.textContent = fn(nickname || '');
}

// ── Row counter toggle wiring ─────────────────────────────────
function wireRowCounterToggles() {
    const toggle = () => document.querySelector('knitting-row-counter')?.toggleDrawer();
    ['counterToggle', 'sbRowCounter', 'heroRowCounter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', e => { e.preventDefault(); toggle(); });
    });
}

// ── Sync lang select value ────────────────────────────────────
function syncLangSelect(lang) {
    const sel = document.getElementById('langSelectTop');
    if (sel) sel.value = lang;
}

// ── Init ──────────────────────────────────────────────────────
let _currentNickname = '';
let _currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initLang({ pageTitles: PAGE_TITLES });

    // Sync select to whatever lang was set by initLang
    syncLangSelect(document.documentElement.lang || 'ko');

    const lang = document.documentElement.lang || 'ko';
    renderMagazine(lang);
    // auth 확정 전까지 초기 렌더 생략 — onAuthStateChanged에서 처리
    updateGreeting('');

    wireRowCounterToggles();
    syncLangSelect(lang);

    // Auth state → 분기 렌더링
    onAuthStateChanged(auth, async user => {
        _currentUser = user || null;
        if (user) {
            try {
                const { getUserProfile } = await import('./auth.js');
                const profile = await getUserProfile(user.uid);
                _currentNickname = profile?.nickname || '';
            } catch (e) {
                _currentNickname = '';
            }
            updateGreeting(_currentNickname);
            loadCommunityPosts(user.uid);        // 내 완성작 로드
            loadProjects(true, user.uid);        // 내 프로젝트 로드
        } else {
            _currentNickname = '';
            updateGreeting('');
            loadCommunityPosts(null);     // 전체 최신글 로드
            loadProjects(false);          // 비로그인 CTA 로드
        }
    });

    // Re-render dynamic sections on language change
    window.addEventListener('langChange', e => {
        const lang = e.detail?.lang || document.documentElement.lang || 'ko';
        renderMagazine(lang);
        loadProjects(!!_currentUser, _currentUser?.uid || null); // 현재 auth 상태 유지
        updateCommunityTitle(_currentUser?.uid || null, lang); // 타이틀만 갱신
        updateGreeting(_currentNickname);
        syncLangSelect(lang);
    });
});
