// mypage.js — 마이페이지 (4탭: 프로필 수정 / 내 도안 / 내 글 / 스크랩)

import { auth, db, storage, initAuth, openAuthModal, getUserProfile, updateUserProfile, checkNicknameAvailable } from './auth.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
    collection, query, orderBy, limit, getDocs,
    doc, getDoc, deleteDoc, updateDoc, where
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { ref, deleteObject } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

// --- i18n ---
const t = {
    ko: {
        mypage: '마이페이지', not_logged_in: '로그인하면 마이페이지를 이용할 수 있습니다.',
        go_to_signin: '로그인', loading: '불러오는 중...',
        empty_patterns: '저장된 도안이 없습니다. 도안을 생성하고 저장해보세요!',
        empty_posts: '작성한 글이 없습니다.', empty_scraps: '스크랩한 글이 없습니다.',
        rename: '이름변경', view_original: '원본', delete: '삭제',
        confirm_delete: '이 도안을 삭제하시겠습니까?', rename_prompt: '새 도안 이름을 입력하세요:',
        stitches: '코', rows: '단', btn_signin: '로그인', btn_signout: '로그아웃',
        btn_mypage: '마이페이지', btn_community: '커뮤니티',
        tab_signin: '로그인', tab_signup: '회원가입', btn_google: 'Google로 계속하기',
        btn_signup: '회원가입', or_divider: '또는', go_generate: '← 도안 만들기',
        footer_generate: '도안 만들기', footer_mypage: '내 도안',
        footer_community: '커뮤니티', footer_about: '소개', footer_privacy: '개인정보처리방침',
        tab_profile: '프로필 수정', tab_mypatterns: '내 도안', tab_myposts: '내 글', tab_scraps: '스크랩',
        profile_save: '저장', profile_saving: '저장 중...', profile_saved: '저장되었습니다.',
        nickname_check: '중복 확인', nickname_checking: '확인 중...',
        nickname_ok: '사용 가능한 닉네임입니다.', nickname_taken: '이미 사용 중인 닉네임입니다.',
        nickname_invalid: '닉네임은 2~20자의 한글·영문·숫자·_만 사용할 수 있습니다.',
        profile_edit_error: '저장 중 오류가 발생했습니다.',
        photo_change: '사진 변경',
        placeholder_nickname: '닉네임 (2~20자, 필수)',
        placeholder_realname: '실명 (선택)',
        mypatterns_title: '내 도안',
    },
    en: {
        mypage: 'My Page', not_logged_in: 'Sign in to access your page.',
        go_to_signin: 'Sign In', loading: 'Loading...',
        empty_patterns: 'No saved patterns yet. Generate a pattern and save it!',
        empty_posts: 'No posts yet.', empty_scraps: 'No scrapped posts yet.',
        rename: 'Rename', view_original: 'Original', delete: 'Delete',
        confirm_delete: 'Delete this pattern?', rename_prompt: 'Enter new pattern name:',
        stitches: 'sts', rows: 'rows', btn_signin: 'Sign In', btn_signout: 'Sign Out',
        btn_mypage: 'My Page', btn_community: 'Community',
        tab_signin: 'Sign In', tab_signup: 'Sign Up', btn_google: 'Continue with Google',
        btn_signup: 'Sign Up', or_divider: 'or', go_generate: '← Create Pattern',
        footer_generate: 'Create Pattern', footer_mypage: 'My Patterns',
        footer_community: 'Community', footer_about: 'About', footer_privacy: 'Privacy Policy',
        tab_profile: 'Edit Profile', tab_mypatterns: 'My Patterns', tab_myposts: 'My Posts', tab_scraps: 'Scraps',
        profile_save: 'Save', profile_saving: 'Saving...', profile_saved: 'Saved.',
        nickname_check: 'Check', nickname_checking: 'Checking...',
        nickname_ok: 'Available.', nickname_taken: 'Already in use.',
        nickname_invalid: '2-20 chars: letters, numbers, _',
        profile_edit_error: 'Error saving profile.',
        photo_change: 'Change Photo',
        placeholder_nickname: 'Nickname (2-20 chars, required)',
        placeholder_realname: 'Real name (optional)',
        mypatterns_title: 'My Patterns',
    },
    ja: {
        mypage: 'マイページ', not_logged_in: 'ログインしてマイページを利用できます。',
        go_to_signin: 'ログイン', loading: '読み込み中...',
        empty_patterns: '保存された編み図がありません。編み図を生成して保存してください！',
        empty_posts: '投稿した記事がありません。', empty_scraps: 'スクラップした記事がありません。',
        rename: '名前変更', view_original: '原画', delete: '削除',
        confirm_delete: 'この編み図を削除しますか？', rename_prompt: '新しい名前を入力してください:',
        stitches: '目', rows: '段', btn_signin: 'ログイン', btn_signout: 'ログアウト',
        btn_mypage: 'マイページ', btn_community: 'コミュニティ',
        tab_signin: 'ログイン', tab_signup: '新規登録', btn_google: 'Googleで続ける',
        btn_signup: '新規登録', or_divider: 'または', go_generate: '← 編み図を作る',
        footer_generate: '編み図を作る', footer_mypage: 'マイ編み図',
        footer_community: 'コミュニティ', footer_about: '紹介', footer_privacy: 'プライバシーポリシー',
        tab_profile: 'プロフィール編集', tab_mypatterns: 'マイ編み図', tab_myposts: '投稿', tab_scraps: 'スクラップ',
        profile_save: '保存', profile_saving: '保存中...', profile_saved: '保存されました。',
        nickname_check: '確認', nickname_checking: '確認中...',
        nickname_ok: '使用可能です。', nickname_taken: '既に使用されています。',
        nickname_invalid: '2〜20文字（ひらがな・英数字・_）',
        profile_edit_error: '保存中にエラーが発生しました。',
        photo_change: '写真変更',
        placeholder_nickname: 'ニックネーム（2〜20文字、必須）',
        placeholder_realname: '本名（任意）',
        mypatterns_title: 'マイ編み図',
    }
};

let currentLang = 'ko';
function tr(key) { return (t[currentLang] && t[currentLang][key]) || key; }

// --- DOM refs ---
const notLoggedInEl = document.getElementById('notLoggedIn');
const loggedInEl = document.getElementById('loggedIn');
const gotoSignInBtn = document.getElementById('gotoSignInBtn');
const langBtns = document.querySelectorAll('.lang-btn[data-lang]');
const loadingMsgEl = document.getElementById('loadingMsg');
const emptyMsgEl = document.getElementById('emptyMsg');
const patternGridEl = document.getElementById('patternGrid');

// --- Language ---
function applyLang(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    langBtns.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-lang') === lang));
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[lang] && t[lang][key]) el.textContent = t[lang][key];
    });
    document.getElementById('mypageTitle').textContent = tr('mypage');
    const myPatternsTitle = document.getElementById('myPatternsTitle');
    if (myPatternsTitle) myPatternsTitle.textContent = tr('mypatterns_title');
    const goGenerateLink = document.getElementById('goGenerateLink');
    if (goGenerateLink) goGenerateLink.textContent = tr('go_generate');
    document.getElementById('notLoggedInMsg').textContent = tr('not_logged_in');
    gotoSignInBtn.textContent = tr('go_to_signin');
    if (loadingMsgEl) loadingMsgEl.textContent = tr('loading');
    if (emptyMsgEl) emptyMsgEl.textContent = tr('empty_patterns');

    // 탭 레이블
    document.querySelectorAll('.mypage-tab').forEach(btn => {
        const tab = btn.getAttribute('data-tab');
        const key = 'tab_' + tab;
        if (t[lang] && t[lang][key]) btn.textContent = t[lang][key];
    });

    // 프로필 편집 패널 — placeholder & label 번역
    const editNicknameEl = document.getElementById('editNickname');
    if (editNicknameEl) editNicknameEl.placeholder = tr('placeholder_nickname');
    const editRealNameEl = document.getElementById('editRealName');
    if (editRealNameEl) editRealNameEl.placeholder = tr('placeholder_realname');
}

langBtns.forEach(btn => {
    btn.addEventListener('click', () => applyLang(btn.getAttribute('data-lang')));
});

const savedLang = localStorage.getItem('lang');
if (savedLang && savedLang !== 'ko') applyLang(savedLang);

// --- Tab 컨트롤러 ---
let currentTab = 'profile';
let currentUid = null;
const tabLoaded = { profile: false, mypatterns: false, myposts: false, scraps: false };

function switchTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll('.mypage-tab').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });
    document.querySelectorAll('.mypage-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    const panel = document.getElementById('panel' + capitalize(tabName));
    if (panel) panel.classList.add('active');

    if (!currentUid) return;
    // myposts는 항상 최신 목록을 보여주기 위해 매번 재로드
    if (tabName === 'myposts') {
        loadMyPosts(currentUid);
    } else if (!tabLoaded[tabName]) {
        tabLoaded[tabName] = true;
        if (tabName === 'profile') loadProfilePanel(currentUid);
        else if (tabName === 'mypatterns') loadPatterns(currentUid);
        else if (tabName === 'scraps') loadScraps(currentUid);
    }
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

document.querySelectorAll('.mypage-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
});

// --- Profile 패널 ---
let editNicknameChecked = false;
let editNicknameAvailable = false;
let originalNickname = '';

async function loadProfilePanel(uid) {
    const profile = await getUserProfile(uid);
    if (!profile) return;

    originalNickname = profile.nickname || '';
    document.getElementById('editNickname').value = originalNickname;
    document.getElementById('editRealName').value = profile.displayName || '';

    // 아바타 미리보기
    const avatarEl = document.getElementById('editAvatarPreview');
    if (profile.profilePhotoURL) {
        avatarEl.style.backgroundImage = `url(${profile.profilePhotoURL})`;
        avatarEl.innerHTML = '';
    } else {
        avatarEl.style.backgroundImage = '';
        avatarEl.innerHTML = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
    }

    // 초기 상태: 닉네임이 그대로면 저장 버튼 활성화
    editNicknameChecked = true;
    editNicknameAvailable = true;
    document.getElementById('profileEditSaveBtn').disabled = false;
}

// 프로필 편집 이벤트
(function initProfileEditPanel() {
    const nicknameInput = document.getElementById('editNickname');
    const checkBtn = document.getElementById('editCheckNicknameBtn');
    const statusEl = document.getElementById('editNicknameStatus');
    const photoInput = document.getElementById('editPhotoInput');
    const avatarEl = document.getElementById('editAvatarPreview');
    const saveBtn = document.getElementById('profileEditSaveBtn');
    const msgEl = document.getElementById('profileEditMsg');

    nicknameInput.addEventListener('input', () => {
        editNicknameChecked = false;
        editNicknameAvailable = false;
        statusEl.style.display = 'none';
        // 닉네임이 원래와 같으면 저장 버튼 활성 유지
        saveBtn.disabled = nicknameInput.value.trim() !== originalNickname;
        if (nicknameInput.value.trim() === originalNickname) {
            editNicknameChecked = true;
            editNicknameAvailable = true;
        }
    });

    photoInput.addEventListener('change', () => {
        const file = photoInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            avatarEl.style.backgroundImage = `url(${e.target.result})`;
            avatarEl.innerHTML = '';
        };
        reader.readAsDataURL(file);
    });

    checkBtn.addEventListener('click', async () => {
        const nickname = nicknameInput.value.trim();
        if (!/^[a-zA-Z0-9가-힣_]{2,20}$/.test(nickname)) {
            statusEl.textContent = tr('nickname_invalid');
            statusEl.className = 'nickname-status error';
            statusEl.style.display = 'block';
            return;
        }
        if (nickname === originalNickname) {
            statusEl.textContent = tr('nickname_ok');
            statusEl.className = 'nickname-status success';
            statusEl.style.display = 'block';
            editNicknameChecked = true;
            editNicknameAvailable = true;
            saveBtn.disabled = false;
            return;
        }
        checkBtn.disabled = true;
        checkBtn.textContent = tr('nickname_checking');
        try {
            const available = await checkNicknameAvailable(nickname);
            editNicknameChecked = true;
            editNicknameAvailable = available;
            statusEl.textContent = available ? tr('nickname_ok') : tr('nickname_taken');
            statusEl.className = 'nickname-status ' + (available ? 'success' : 'error');
            statusEl.style.display = 'block';
            saveBtn.disabled = !available;
        } catch {
            statusEl.textContent = '오류가 발생했습니다.';
            statusEl.className = 'nickname-status error';
            statusEl.style.display = 'block';
        } finally {
            checkBtn.disabled = false;
            checkBtn.textContent = tr('nickname_check');
        }
    });

    document.getElementById('profileEditForm').addEventListener('submit', async e => {
        e.preventDefault();
        if (!editNicknameChecked || !editNicknameAvailable) {
            msgEl.textContent = '닉네임 중복 확인을 완료해주세요.';
            msgEl.className = 'nickname-status error';
            msgEl.style.display = 'block';
            return;
        }
        const nickname = nicknameInput.value.trim();
        const realName = document.getElementById('editRealName').value.trim();
        const photoFile = photoInput.files[0] || null;
        const uid = currentUid;

        saveBtn.disabled = true;
        saveBtn.textContent = tr('profile_saving');
        msgEl.style.display = 'none';

        try {
            await updateUserProfile(uid, { nickname, currentNickname: originalNickname, realName, photoFile });
            originalNickname = nickname;
            photoInput.value = '';
            // 헤더 닉네임 갱신
            const userEmailEl = document.getElementById('authUserEmail');
            if (userEmailEl) userEmailEl.textContent = nickname;
            msgEl.textContent = tr('profile_saved');
            msgEl.className = 'nickname-status success';
            msgEl.style.display = 'block';
        } catch (err) {
            msgEl.textContent = tr('profile_edit_error') + ' ' + err.message;
            msgEl.className = 'nickname-status error';
            msgEl.style.display = 'block';
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = tr('profile_save');
        }
    });
})();

// --- Load Patterns ---
async function loadPatterns(uid) {
    loadingMsgEl.style.display = 'block';
    emptyMsgEl.style.display = 'none';
    patternGridEl.innerHTML = '';

    try {
        const q = query(
            collection(db, `users/${uid}/patterns`),
            orderBy('createdAt', 'desc'),
            limit(50)
        );
        const snap = await getDocs(q);
        loadingMsgEl.style.display = 'none';
        if (snap.empty) { emptyMsgEl.style.display = 'block'; return; }
        snap.forEach(docSnap => patternGridEl.appendChild(buildPatternCard(uid, docSnap.id, docSnap.data())));
    } catch (e) {
        console.error('Failed to load patterns:', e);
        loadingMsgEl.textContent = '불러오기 실패. 다시 시도해주세요.';
    }
}

function buildPatternCard(uid, patternId, data) {
    const card = document.createElement('div');
    card.className = 'pattern-card';
    const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('ko-KR') : '';

    card.innerHTML = `
        <img class="pattern-card-thumb" src="${data.patternImageURL}" alt="${escHtml(data.name)}" loading="lazy"
             onerror="this.style.background='#eee'">
        <div class="pattern-card-body">
          <p class="pattern-card-name" title="${escHtml(data.name)}">${escHtml(data.name)}</p>
          <p class="pattern-card-meta">${data.stitches}${tr('stitches')} × ${data.rows}${tr('rows')} · ${date}</p>
          <div class="pattern-card-actions">
            <button class="rename-btn">${tr('rename')}</button>
            <a href="${data.originalImageURL}" target="_blank" rel="noopener">${tr('view_original')}</a>
            <button class="delete-btn">${tr('delete')}</button>
          </div>
        </div>
    `;

    card.querySelector('.pattern-card-thumb').addEventListener('click', () => window.open(data.patternImageURL, '_blank'));

    card.querySelector('.rename-btn').addEventListener('click', async () => {
        const newName = window.prompt(tr('rename_prompt'), data.name);
        if (!newName || newName.trim() === data.name) return;
        const trimmed = newName.trim();
        try {
            await updateDoc(doc(db, `users/${uid}/patterns/${patternId}`), { name: trimmed });
            card.querySelector('.pattern-card-name').textContent = trimmed;
            card.querySelector('.pattern-card-name').title = trimmed;
            data.name = trimmed;
        } catch (e) { console.error('Rename failed:', e); }
    });

    card.querySelector('.delete-btn').addEventListener('click', async () => {
        if (!window.confirm(tr('confirm_delete'))) return;
        try {
            const basePath = `users/${uid}/patterns/${patternId}`;
            await Promise.allSettled([
                deleteObject(ref(storage, `${basePath}/pattern.png`)),
                deleteObject(ref(storage, `${basePath}/original.jpg`))
            ]);
            await deleteDoc(doc(db, `users/${uid}/patterns/${patternId}`));
            card.remove();
            if (patternGridEl.children.length === 0) emptyMsgEl.style.display = 'block';
        } catch (e) { console.error('Delete failed:', e); }
    });

    return card;
}

// --- Load My Posts ---
async function loadMyPosts(uid) {
    const loadingEl = document.getElementById('myPostsLoading');
    const emptyEl = document.getElementById('myPostsEmpty');
    const gridEl = document.getElementById('myPostsGrid');
    loadingEl.style.display = 'block';
    emptyEl.style.display = 'none';
    gridEl.innerHTML = '';

    try {
        // orderBy 없이 uid 필터만 사용 (복합 인덱스 불필요), 클라이언트 정렬
        const q = query(
            collection(db, 'posts'),
            where('uid', '==', uid),
            limit(50)
        );
        const snap = await getDocs(q);
        loadingEl.style.display = 'none';
        if (snap.empty) { emptyEl.style.display = 'block'; return; }
        // 최신순 정렬
        const docs = snap.docs.sort((a, b) => {
            const at = a.data().createdAt?.seconds || 0;
            const bt = b.data().createdAt?.seconds || 0;
            return bt - at;
        });
        docs.forEach(docSnap => gridEl.appendChild(buildPostCard(docSnap.id, docSnap.data())));
    } catch (e) {
        console.error('Failed to load posts:', e);
        loadingEl.style.display = 'none';
        emptyEl.textContent = '불러오기 실패. 잠시 후 다시 시도해주세요.';
        emptyEl.style.display = 'block';
    }
}

// --- Load Scraps ---
async function loadScraps(uid) {
    const loadingEl = document.getElementById('scrapsLoading');
    const emptyEl = document.getElementById('scrapsEmpty');
    const gridEl = document.getElementById('scrapsGrid');
    loadingEl.style.display = 'block';
    emptyEl.style.display = 'none';
    gridEl.innerHTML = '';

    try {
        const scrapsSnap = await getDocs(
            query(collection(db, `users/${uid}/scraps`), orderBy('scrappedAt', 'desc'), limit(50))
        );
        if (scrapsSnap.empty) {
            loadingEl.style.display = 'none';
            emptyEl.style.display = 'block';
            return;
        }
        const postDocs = await Promise.all(
            scrapsSnap.docs.map(s => getDoc(doc(db, 'posts', s.id)))
        );
        loadingEl.style.display = 'none';
        let count = 0;
        postDocs.forEach(postDoc => {
            if (postDoc.exists()) {
                gridEl.appendChild(buildPostCard(postDoc.id, postDoc.data()));
                count++;
            }
        });
        if (count === 0) emptyEl.style.display = 'block';
    } catch (e) {
        console.error('Failed to load scraps:', e);
        loadingEl.textContent = '불러오기 실패.';
    }
}

function buildPostCard(postId, data) {
    const card = document.createElement('a');
    card.className = 'post-card';
    card.href = `/post.html?id=${postId}`;

    const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('ko-KR') : '';
    const thumb = data.images && data.images[0]
        ? `<div class="post-card-thumb" style="background-image:url(${escHtml(data.images[0])})"></div>`
        : (data.patternImageURL ? `<div class="post-card-thumb" style="background-image:url(${escHtml(data.patternImageURL)})"></div>` : '<div class="post-card-thumb post-card-thumb-empty"></div>');
    const tagsHtml = (data.tags || []).slice(0, 3).map(tag => `<span class="post-card-tag">${escHtml(tag)}</span>`).join('');

    card.innerHTML = `
        ${thumb}
        <div class="post-card-body">
          <div class="post-card-tags">${tagsHtml}</div>
          <p class="post-card-title">${escHtml(data.title || '')}</p>
          <p class="post-card-meta">${escHtml(data.nickname || '')} · ${date} · ♥ ${data.likeCount || 0}</p>
        </div>
    `;
    return card;
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- Auth + 페이지 초기화 ---
function initPageAuth() {
    initAuth();
    gotoSignInBtn.addEventListener('click', openAuthModal);

    onAuthStateChanged(auth, async user => {
        const isVerified = user && (user.emailVerified || user.providerData.some(p => p.providerId === 'google.com'));
        if (isVerified) {
            notLoggedInEl.style.display = 'none';
            loggedInEl.style.display = 'block';
            currentUid = user.uid;
            // 기본 탭(profile) 첫 로드
            if (!tabLoaded['profile']) {
                tabLoaded['profile'] = true;
                await loadProfilePanel(user.uid);
            }
        } else {
            notLoggedInEl.style.display = 'block';
            loggedInEl.style.display = 'none';
            currentUid = null;
        }
    });
}

initPageAuth();
