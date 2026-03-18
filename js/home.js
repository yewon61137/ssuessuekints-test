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

// ── Community posts (Firestore) ───────────────────────────────
async function loadCommunityPosts() {
    const el = document.getElementById('communityGrid');
    if (!el) return;
    try {
        const q = query(
            collection(db, 'posts'),
            where('tags', 'array-contains', 'finished'),
            orderBy('createdAt', 'desc'),
            limit(3)
        );
        const snap = await getDocs(q);
        if (snap.empty) {
            // keep placeholder skeleton
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
                        ? `<img src="${p.imgUrl}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;">`
                        : `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`}
                </div>
                <div class="cg-name">${p.title}</div>
                <div class="cg-meta">${p.nick}</div>
            </a>`).join('');
    } catch (e) {
        // Firestore unavailable (e.g. local dev without config) — silently keep placeholder
        console.warn('loadCommunityPosts:', e.message);
    }
}

// ── Saved count (Firestore) ───────────────────────────────────
async function loadSavedCount(uid) {
    const el = document.getElementById('savedCount');
    if (!el) return;
    try {
        const snap = await getDocs(collection(db, 'users', uid, 'patterns'));
        el.textContent = snap.size;
    } catch (e) {
        // ignore
    }
}

// ── Projects (localStorage row counters) ─────────────────────
const PROJ_EMPTY = {
    ko: '단수 카운터에서 프로젝트를 추가해보세요',
    en: 'Add projects in the row counter',
    ja: '段数カウンターでプロジェクトを追加',
};

function loadProjects() {
    const listEl = document.getElementById('projectList');
    const cntEl = document.getElementById('projectCount');
    if (!listEl) return;

    let counters = [];
    try {
        const raw = localStorage.getItem('ssuessue_row_counters');
        if (raw) counters = JSON.parse(raw);
        if (!Array.isArray(counters)) counters = [];
    } catch (e) { counters = []; }

    if (cntEl) cntEl.textContent = counters.length;

    if (counters.length === 0) {
        const lang = document.documentElement.lang || 'ko';
        const msg = PROJ_EMPTY[lang] || PROJ_EMPTY.ko;
        listEl.innerHTML = `
            <div class="empty-state">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ddd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                <span>${msg}</span>
            </div>`;
        return;
    }

    listEl.innerHTML = counters.map(c => {
        const name = c.name ? String(c.name).substring(0, 30) : 'Project';
        const count = Number(c.count) || 0;
        const goal = Number(c.goalRows) || 0;
        const pct = goal > 0 ? Math.min(100, Math.round(count / goal * 100)) : 0;
        return `
            <div class="proj-item" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #e9e5dd;">
                <div style="flex:1;min-width:0;">
                    <div style="font-size:.85rem;font-weight:600;color:#1a1a1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</div>
                    <div style="font-size:.75rem;color:#999;margin-top:2px;">${count}${goal ? ' / ' + goal : ''} rows</div>
                    ${goal > 0 ? `<div style="height:3px;background:#e9e5dd;border-radius:2px;margin-top:4px;"><div style="height:3px;background:#1a1a1a;border-radius:2px;width:${pct}%;"></div></div>` : ''}
                </div>
                <div style="font-size:1rem;font-weight:700;color:#1a1a1a;flex-shrink:0;">${count}</div>
            </div>`;
    }).join('');
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
    ['counterToggle', 'sbRowCounter', 'heroRowCounter', 'toolCounterCard'].forEach(id => {
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

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initLang({ pageTitles: PAGE_TITLES });

    // Sync select to whatever lang was set by initLang
    syncLangSelect(document.documentElement.lang || 'ko');

    const lang = document.documentElement.lang || 'ko';
    renderMagazine(lang);
    loadCommunityPosts();
    loadProjects();
    updateGreeting('');

    wireRowCounterToggles();
    syncLangSelect(lang);

    // Auth state → greeting + saved count
    onAuthStateChanged(auth, async user => {
        if (user) {
            try {
                const { getUserProfile } = await import('./auth.js');
                const profile = await getUserProfile(user.uid);
                _currentNickname = profile?.nickname || '';
            } catch (e) {
                _currentNickname = '';
            }
            updateGreeting(_currentNickname);
            loadSavedCount(user.uid);
        } else {
            _currentNickname = '';
            updateGreeting('');
            const el = document.getElementById('savedCount');
            if (el) el.textContent = '0';
        }
    });

    // Re-render dynamic sections on language change
    window.addEventListener('langChange', e => {
        const lang = e.detail?.lang || document.documentElement.lang || 'ko';
        renderMagazine(lang);
        loadProjects(); // re-render empty state message in new lang
        updateGreeting(_currentNickname);
        syncLangSelect(lang);
    });
});
