// mypage.js — 내 도안 페이지 로직
// Firebase 서비스는 auth.js에서 공유 (재초기화 방지)

import { auth, db, storage } from './auth.js';
import {
    onAuthStateChanged,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    doc,
    deleteDoc,
    updateDoc
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {
    ref,
    deleteObject
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

// --- i18n ---
const t = {
    ko: {
        mypatterns: '내 도안', not_logged_in: '로그인하면 저장된 도안을 볼 수 있습니다.',
        go_to_signin: '로그인', loading: '불러오는 중...', empty: '저장된 도안이 없습니다. 도안을 생성하고 저장해보세요!',
        rename: '이름변경', view_original: '원본', delete: '삭제',
        confirm_delete: '이 도안을 삭제하시겠습니까?', rename_prompt: '새 도안 이름을 입력하세요:',
        stitches: '코', rows: '단', btn_signin: '로그인', btn_signout: '로그아웃', btn_mypage: '내 도안',
        tab_signin: '로그인', tab_signup: '회원가입', btn_google: 'Google로 계속하기',
        btn_signup: '회원가입', or_divider: '또는', go_generate: '← 도안 만들기',
    },
    en: {
        mypatterns: 'My Patterns', not_logged_in: 'Sign in to view your saved patterns.',
        go_to_signin: 'Sign In', loading: 'Loading...', empty: 'No saved patterns yet. Generate a pattern and save it!',
        rename: 'Rename', view_original: 'Original', delete: 'Delete',
        confirm_delete: 'Delete this pattern?', rename_prompt: 'Enter new pattern name:',
        stitches: 'sts', rows: 'rows', btn_signin: 'Sign In', btn_signout: 'Sign Out', btn_mypage: 'My Patterns',
        tab_signin: 'Sign In', tab_signup: 'Sign Up', btn_google: 'Continue with Google',
        btn_signup: 'Sign Up', or_divider: 'or', go_generate: '← Create Pattern',
    },
    ja: {
        mypatterns: 'マイ編み図', not_logged_in: 'ログインして保存した編み図を確認しましょう。',
        go_to_signin: 'ログイン', loading: '読み込み中...', empty: '保存された編み図がありません。編み図を生成して保存してください！',
        rename: '名前変更', view_original: '原画', delete: '削除',
        confirm_delete: 'この編み図を削除しますか？', rename_prompt: '新しい名前を入力してください:',
        stitches: '目', rows: '段', btn_signin: 'ログイン', btn_signout: 'ログアウト', btn_mypage: 'マイ編み図',
        tab_signin: 'ログイン', tab_signup: '新規登録', btn_google: 'Googleで続ける',
        btn_signup: '新規登録', or_divider: 'または', go_generate: '← 編み図を作る',
    }
};

let currentLang = 'ko';
function tr(key) { return (t[currentLang] && t[currentLang][key]) || key; }

// --- DOM refs ---
const notLoggedInEl = document.getElementById('notLoggedIn');
const loggedInEl = document.getElementById('loggedIn');
const loadingMsgEl = document.getElementById('loadingMsg');
const emptyMsgEl = document.getElementById('emptyMsg');
const patternGridEl = document.getElementById('patternGrid');
const gotoSignInBtn = document.getElementById('gotoSignInBtn');
const langBtns = document.querySelectorAll('.lang-btn[data-lang]');

// --- Language ---
function applyLang(lang) {
    currentLang = lang;
    langBtns.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-lang') === lang));
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[lang][key]) el.textContent = t[lang][key];
    });
    document.getElementById('mypageTitle').textContent = tr('mypatterns');
    document.getElementById('myPatternsTitle').textContent = tr('mypatterns');
    document.querySelector('#loggedIn a.lang-btn').textContent = tr('go_generate');
    document.getElementById('notLoggedInMsg').textContent = tr('not_logged_in');
    gotoSignInBtn.textContent = tr('go_to_signin');
    loadingMsgEl.textContent = tr('loading');
    emptyMsgEl.textContent = tr('empty');
}

langBtns.forEach(btn => {
    btn.addEventListener('click', () => applyLang(btn.getAttribute('data-lang')));
});

// --- Auth Modal ---
function initAuthModal() {
    const signInBtn = document.getElementById('authSignInBtn');
    const userArea = document.getElementById('authUserArea');
    const userEmail = document.getElementById('authUserEmail');
    const signOutBtn = document.getElementById('authSignOutBtn');
    const modal = document.getElementById('authModal');

    const clearError = () => { const el = document.getElementById('authModalError'); if (el) { el.textContent = ''; el.style.display = 'none'; } };
    const showError = (msg) => { const el = document.getElementById('authModalError'); if (el) { el.textContent = msg; el.style.display = 'block'; } };
    const getErrMsg = (code) => ({
        'auth/user-not-found': '등록되지 않은 이메일입니다.',
        'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
        'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
        'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
        'auth/invalid-email': '유효하지 않은 이메일 형식입니다.',
        'auth/too-many-requests': '잠시 후 다시 시도해주세요.',
        'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
    })[code] || '로그인 중 오류가 발생했습니다.';

    const switchTab = (tab) => {
        const isSignIn = tab === 'signin';
        document.getElementById('tabSignIn').classList.toggle('active', isSignIn);
        document.getElementById('tabSignUp').classList.toggle('active', !isSignIn);
        document.getElementById('signinPanel').style.display = isSignIn ? 'block' : 'none';
        document.getElementById('signupPanel').style.display = isSignIn ? 'none' : 'block';
        clearError();
    };

    signInBtn.addEventListener('click', () => { modal.style.display = 'flex'; clearError(); });
    gotoSignInBtn.addEventListener('click', () => { modal.style.display = 'flex'; clearError(); });
    signOutBtn.addEventListener('click', () => signOut(auth));
    modal.addEventListener('click', (e) => { if (e.target === modal) { modal.style.display = 'none'; clearError(); } });
    document.getElementById('modalCloseBtn').addEventListener('click', () => { modal.style.display = 'none'; clearError(); });
    document.getElementById('tabSignIn').addEventListener('click', () => switchTab('signin'));
    document.getElementById('tabSignUp').addEventListener('click', () => switchTab('signup'));

    document.getElementById('googleSignInBtn').addEventListener('click', async () => {
        clearError();
        try { await signInWithPopup(auth, new GoogleAuthProvider()); modal.style.display = 'none'; }
        catch (e) { showError(e.message); }
    });

    document.getElementById('emailSignInForm').addEventListener('submit', async (e) => {
        e.preventDefault(); clearError();
        try {
            await signInWithEmailAndPassword(auth, document.getElementById('signinEmail').value, document.getElementById('signinPassword').value);
            modal.style.display = 'none';
        } catch (err) { showError(getErrMsg(err.code)); }
    });

    document.getElementById('emailSignUpForm').addEventListener('submit', async (e) => {
        e.preventDefault(); clearError();
        const pw = document.getElementById('signupPassword').value;
        if (pw !== document.getElementById('signupConfirm').value) { showError('비밀번호가 일치하지 않습니다.'); return; }
        try {
            await createUserWithEmailAndPassword(auth, document.getElementById('signupEmail').value, pw);
            modal.style.display = 'none';
        } catch (err) { showError(getErrMsg(err.code)); }
    });

    // Auth state → 페이지 표시 결정
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            signInBtn.style.display = 'none';
            userArea.style.display = 'flex';
            userEmail.textContent = user.displayName || user.email || '';
            notLoggedInEl.style.display = 'none';
            loggedInEl.style.display = 'block';
            await loadPatterns(user.uid);
        } else {
            signInBtn.style.display = 'inline-block';
            userArea.style.display = 'none';
            notLoggedInEl.style.display = 'block';
            loggedInEl.style.display = 'none';
        }
    });
}

// --- Load & Render Patterns ---
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

        snap.forEach(docSnap => {
            patternGridEl.appendChild(buildCard(uid, docSnap.id, docSnap.data()));
        });
    } catch (e) {
        console.error('Failed to load patterns:', e);
        loadingMsgEl.textContent = '불러오기 실패. 다시 시도해주세요.';
    }
}

function buildCard(uid, patternId, data) {
    const card = document.createElement('div');
    card.className = 'pattern-card';

    const date = data.createdAt
        ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('ko-KR')
        : '';

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

    card.querySelector('.pattern-card-thumb').addEventListener('click', () => {
        window.open(data.patternImageURL, '_blank');
    });

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

function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// --- Init ---
initAuthModal();
