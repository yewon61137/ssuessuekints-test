// community.js — 커뮤니티 피드

import { auth, db, storage, initAuth, openAuthModal, getUserProfile } from './auth.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
    collection, query, orderBy, limit, getDocs, addDoc,
    serverTimestamp, where, startAfter, doc, getDoc
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {
    ref, uploadBytes, getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

const PAGE_SIZE = 12;
let currentTagFilter = '';
let lastDoc = null;
let isLoading = false;
let currentUser = null;

// --- i18n (최소) ---
const langBtns = document.querySelectorAll('.lang-btn[data-lang]');
const tMap = {
    ko: { btn_signin: '로그인', btn_signout: '로그아웃', btn_mypage: '마이페이지', btn_community: '커뮤니티',
          tab_signin: '로그인', tab_signup: '회원가입', btn_google: 'Google로 계속하기', btn_signup: '회원가입',
          or_divider: '또는', footer_generate: '도안 만들기', footer_mypage: '내 도안',
          footer_community: '커뮤니티', footer_about: '소개', footer_privacy: '개인정보처리방침' },
    en: { btn_signin: 'Sign In', btn_signout: 'Sign Out', btn_mypage: 'My Page', btn_community: 'Community',
          tab_signin: 'Sign In', tab_signup: 'Sign Up', btn_google: 'Continue with Google', btn_signup: 'Sign Up',
          or_divider: 'or', footer_generate: 'Create Pattern', footer_mypage: 'My Patterns',
          footer_community: 'Community', footer_about: 'About', footer_privacy: 'Privacy Policy' },
    ja: { btn_signin: 'ログイン', btn_signout: 'ログアウト', btn_mypage: 'マイページ', btn_community: 'コミュニティ',
          tab_signin: 'ログイン', tab_signup: '新規登録', btn_google: 'Googleで続ける', btn_signup: '新規登録',
          or_divider: 'または', footer_generate: '編み図を作る', footer_mypage: 'マイ編み図',
          footer_community: 'コミュニティ', footer_about: '紹介', footer_privacy: 'プライバシーポリシー' }
};

function applyLang(lang) {
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    langBtns.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-lang') === lang));
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (tMap[lang] && tMap[lang][key]) el.textContent = tMap[lang][key];
    });
}

langBtns.forEach(btn => btn.addEventListener('click', () => applyLang(btn.getAttribute('data-lang'))));
const savedLang = localStorage.getItem('lang');
if (savedLang && savedLang !== 'ko') applyLang(savedLang);

// --- 피드 로드 ---
async function loadFeed(tagFilter = '', cursorDoc = null) {
    if (isLoading) return;
    isLoading = true;

    const loadingEl = document.getElementById('feedLoading');
    const emptyEl = document.getElementById('feedEmpty');
    const gridEl = document.getElementById('postGrid');
    const loadMoreArea = document.getElementById('loadMoreArea');

    if (!cursorDoc) {
        gridEl.innerHTML = '';
        loadingEl.style.display = 'block';
        emptyEl.style.display = 'none';
        loadMoreArea.style.display = 'none';
    }

    try {
        let q;
        if (tagFilter) {
            q = query(
                collection(db, 'posts'),
                where('tags', 'array-contains', tagFilter),
                orderBy('createdAt', 'desc'),
                limit(PAGE_SIZE)
            );
        } else {
            q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
        }
        if (cursorDoc) q = query(q, startAfter(cursorDoc));

        const snap = await getDocs(q);
        loadingEl.style.display = 'none';

        if (snap.empty && !cursorDoc) {
            emptyEl.style.display = 'block';
            isLoading = false;
            return;
        }

        snap.forEach(docSnap => {
            const data = docSnap.data();
            // 비공개 게시글은 피드에서 숨김
            if (data.isPublic === false) return;
            gridEl.appendChild(renderPostCard(docSnap.id, data));
        });

        if (snap.docs.length === PAGE_SIZE) {
            lastDoc = snap.docs[snap.docs.length - 1];
            loadMoreArea.style.display = 'block';
        } else {
            lastDoc = null;
            loadMoreArea.style.display = 'none';
        }
    } catch (e) {
        console.error('Feed load error:', e);
        loadingEl.textContent = '불러오기 실패. 다시 시도해주세요.';
    }
    isLoading = false;
}

function renderPostCard(postId, data) {
    const card = document.createElement('a');
    card.className = 'post-card';
    card.href = `/post.html?id=${postId}`;

    const date = data.createdAt
        ? new Date(data.createdAt.seconds * 1000).toLocaleString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';
    const thumb = data.images && data.images[0]
        ? `<div class="post-card-thumb" style="background-image:url(${escHtml(data.images[0])})"></div>`
        : (data.patternImageURL ? `<div class="post-card-thumb" style="background-image:url(${escHtml(data.patternImageURL)})"></div>` : '<div class="post-card-thumb post-card-thumb-empty"></div>');
    const tagsHtml = (data.tags || []).slice(0, 3).map(tag => `<span class="post-card-tag">${escHtml(tag)}</span>`).join('');

    const avatarStyle = data.profilePhotoURL ? `style="background-image:url(${escHtml(data.profilePhotoURL)})"` : '';
    const avatarInner = data.profilePhotoURL ? '' : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
    const avatarHtml = `<span class="post-card-avatar-sm" ${avatarStyle}>${avatarInner}</span>`;

    const authorHtml = data.uid
        ? `<span class="post-card-author-link" data-author-uid="${escHtml(data.uid)}">${escHtml(data.nickname || '')}</span>`
        : `<span>${escHtml(data.nickname || '')}</span>`;

    card.innerHTML = `
        ${thumb}
        <div class="post-card-body">
          <div class="post-card-tags">${tagsHtml}</div>
          <p class="post-card-title">${escHtml(data.title || '')}</p>
          <div class="post-card-meta">${avatarHtml}${authorHtml}<span class="post-card-date"> · ${date}</span><span class="post-card-counts"> · ♥ ${data.likeCount || 0} · 💬 ${data.commentCount || 0}</span></div>
        </div>
    `;

    const authorEl = card.querySelector('.post-card-author-link');
    if (authorEl) {
        authorEl.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = `/mypage.html?uid=${authorEl.dataset.authorUid}`;
        });
    }

    return card;
}

// --- 태그 필터 ---
document.getElementById('tagFilterRow').addEventListener('click', e => {
    const chip = e.target.closest('.tag-chip');
    if (!chip) return;
    document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentTagFilter = chip.getAttribute('data-tag');
    lastDoc = null;
    loadFeed(currentTagFilter, null);
});

// 더 보기 버튼
document.getElementById('loadMoreBtn').addEventListener('click', () => {
    if (lastDoc) loadFeed(currentTagFilter, lastDoc);
});

// --- 글쓰기 ---
const writeBtn = document.getElementById('writeBtn');
const writeModal = document.getElementById('writeModal');
const writeModalClose = document.getElementById('writeModalClose');
const imageFiles = [null, null, null, null];

writeBtn.addEventListener('click', () => {
    const isVerified = currentUser && (currentUser.emailVerified || currentUser.providerData.some(p => p.providerId === 'google.com'));
    if (!isVerified) {
        openAuthModal();
        return;
    }
    openWriteModal();
});

writeModalClose.addEventListener('click', closeWriteModal);
writeModal.addEventListener('click', e => { if (e.target === writeModal) closeWriteModal(); });

async function openWriteModal() {
    writeModal.style.display = 'flex';
    document.getElementById('writeTitle').value = '';
    document.getElementById('writeContent').value = '';
    document.querySelectorAll('input[name="writeTag"]').forEach(cb => cb.checked = false);
    document.getElementById('writeIsPublic').checked = true;
    document.getElementById('writeError').style.display = 'none';

    // 이미지 슬롯 초기화
    for (let i = 0; i < 4; i++) {
        imageFiles[i] = null;
        resetImageSlot(i);
    }

    // 내 도안 목록 로드
    await loadMyPatternsForSelect();
}

function closeWriteModal() {
    writeModal.style.display = 'none';
}

function resetImageSlot(idx) {
    const slot = document.getElementById(`imgSlot${idx}`);
    slot.innerHTML = `<label>+ 사진 추가<input type="file" accept="image/*" class="img-file-input" data-idx="${idx}"></label>`;
    slot.querySelector('.img-file-input').addEventListener('change', handleImageSelect);
}

// 이미지 파일 선택 핸들러 초기화
document.querySelectorAll('.img-file-input').forEach(input => {
    input.addEventListener('change', handleImageSelect);
});

function handleImageSelect(e) {
    const idx = parseInt(e.target.getAttribute('data-idx'));
    const file = e.target.files[0];
    if (!file) return;
    imageFiles[idx] = file;
    const slot = document.getElementById(`imgSlot${idx}`);
    const url = URL.createObjectURL(file);
    slot.innerHTML = `
        <div class="img-slot-preview" style="background-image:url(${url})"></div>
        <button type="button" class="img-slot-remove" data-idx="${idx}">×</button>
    `;
    slot.querySelector('.img-slot-remove').addEventListener('click', () => {
        imageFiles[idx] = null;
        resetImageSlot(idx);
    });
}

async function loadMyPatternsForSelect() {
    if (!currentUser) return;
    const select = document.getElementById('writePatternSelect');
    select.innerHTML = '<option value="">연결 안 함</option>';
    try {
        const snap = await getDocs(query(
            collection(db, `users/${currentUser.uid}/patterns`),
            orderBy('createdAt', 'desc'),
            limit(30)
        ));
        snap.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.setAttribute('data-thumb', d.data().patternImageURL || '');
            opt.textContent = d.data().name || '도안';
            select.appendChild(opt);
        });
    } catch (e) { console.error('Pattern load error:', e); }
}

document.getElementById('writeForm').addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = document.getElementById('writeSubmitBtn');
    const errorEl = document.getElementById('writeError');
    submitBtn.disabled = true;
    submitBtn.textContent = '게시 중...';
    errorEl.style.display = 'none';

    try {
        const user = currentUser;
        if (!user) throw new Error('로그인이 필요합니다.');

        const profile = await getUserProfile(user.uid);
        const title = document.getElementById('writeTitle').value.trim();
        const content = document.getElementById('writeContent').value.trim();
        const tags = Array.from(document.querySelectorAll('input[name="writeTag"]:checked')).map(cb => cb.value);

        // 도안 연결
        const patternSelect = document.getElementById('writePatternSelect');
        const patternId = patternSelect.value || null;
        let patternImageURL = null;
        if (patternId) {
            const selectedOpt = patternSelect.options[patternSelect.selectedIndex];
            patternImageURL = selectedOpt.getAttribute('data-thumb') || null;
        }

        // 이미지 업로드
        const postId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const uploadedURLs = [];
        for (let i = 0; i < 4; i++) {
            if (imageFiles[i]) {
                const imgRef = ref(storage, `posts/${postId}/images/${i}.jpg`);
                await uploadBytes(imgRef, imageFiles[i]);
                uploadedURLs.push(await getDownloadURL(imgRef));
            }
        }

        const isPublic = document.getElementById('writeIsPublic').checked;

        await addDoc(collection(db, 'posts'), {
            uid: user.uid,
            nickname: profile?.nickname || user.displayName || '',
            profilePhotoURL: profile?.profilePhotoURL || null,
            title,
            content,
            images: uploadedURLs,
            patternId,
            patternImageURL,
            tags,
            isPublic,
            likeCount: 0,
            scrapCount: 0,
            commentCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        closeWriteModal();
        lastDoc = null;
        loadFeed(currentTagFilter, null);
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '게시하기';
    }
});

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- 인증 초기화 ---
initAuth();

onAuthStateChanged(auth, user => {
    const isVerified = user && (user.emailVerified || user.providerData.some(p => p.providerId === 'google.com'));
    currentUser = isVerified ? user : null;
});

// 페이지 로드 시 피드
loadFeed();
