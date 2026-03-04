// post.js — 게시글 상세 페이지

import { auth, db, storage, initAuth, openAuthModal, getUserProfile } from './auth.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
    doc, getDoc, collection, query, orderBy, getDocs,
    addDoc, deleteDoc, serverTimestamp, runTransaction, increment
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { ref, deleteObject, listAll } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

// --- i18n (최소) ---
const langBtns = document.querySelectorAll('.lang-btn[data-lang]');
const tMap = {
    ko: { btn_signin: '로그인', btn_signout: '로그아웃', btn_mypage: '내 도안', btn_community: '커뮤니티',
          tab_signin: '로그인', tab_signup: '회원가입', btn_google: 'Google로 계속하기', btn_signup: '회원가입',
          or_divider: '또는', footer_generate: '도안 만들기', footer_mypage: '내 도안',
          footer_community: '커뮤니티', footer_about: '소개', footer_privacy: '개인정보처리방침' },
    en: { btn_signin: 'Sign In', btn_signout: 'Sign Out', btn_mypage: 'My Patterns', btn_community: 'Community',
          tab_signin: 'Sign In', tab_signup: 'Sign Up', btn_google: 'Continue with Google', btn_signup: 'Sign Up',
          or_divider: 'or', footer_generate: 'Create Pattern', footer_mypage: 'My Patterns',
          footer_community: 'Community', footer_about: 'About', footer_privacy: 'Privacy Policy' },
    ja: { btn_signin: 'ログイン', btn_signout: 'ログアウト', btn_mypage: 'マイ編み図', btn_community: 'コミュニティ',
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

// --- 상태 ---
const params = new URLSearchParams(location.search);
const postId = params.get('id');
let currentUser = null;
let postData = null;
let isLiked = false;
let isScrapped = false;

// --- 게시글 로드 ---
async function loadPost(pid) {
    if (!pid) { showNotFound(); return; }
    try {
        const snap = await getDoc(doc(db, 'posts', pid));
        if (!snap.exists()) { showNotFound(); return; }
        postData = snap.data();
        renderPost(pid, postData);
        await loadComments(pid);
    } catch (e) {
        console.error('Post load error:', e);
        showNotFound();
    }
}

function showNotFound() {
    document.getElementById('postLoading').style.display = 'none';
    document.getElementById('postNotFound').style.display = 'block';
}

function renderPost(pid, data) {
    document.getElementById('postLoading').style.display = 'none';
    document.getElementById('postContent').style.display = 'block';
    document.title = `${data.title || '게시글'} | SSUESSUE KNITS`;

    // 태그
    const tagsEl = document.getElementById('postTags');
    tagsEl.innerHTML = (data.tags || []).map(tag => `<span class="post-card-tag">${escHtml(tag)}</span>`).join('');

    // 제목
    document.getElementById('postTitle').textContent = data.title || '';

    // 작성자
    const avatarEl = document.getElementById('postAuthorAvatar');
    if (data.profilePhotoURL) {
        avatarEl.style.backgroundImage = `url(${data.profilePhotoURL})`;
    } else {
        avatarEl.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
    }
    document.getElementById('postAuthorName').textContent = data.nickname || '';
    const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('ko-KR') : '';
    document.getElementById('postDate').textContent = date;

    // 이미지 갤러리
    const gallery = document.getElementById('postImageGallery');
    gallery.innerHTML = '';
    (data.images || []).forEach(url => {
        const img = document.createElement('img');
        img.className = 'gallery-img';
        img.src = url;
        img.loading = 'lazy';
        img.addEventListener('click', () => window.open(url, '_blank'));
        gallery.appendChild(img);
    });

    // 본문
    const bodyEl = document.getElementById('postBody');
    bodyEl.textContent = data.content || '';

    // 연결 도안
    if (data.patternImageURL) {
        document.getElementById('postLinkedPattern').style.display = 'flex';
        document.getElementById('postLinkedThumb').src = data.patternImageURL;
    }

    // 카운터
    document.getElementById('likeCount').textContent = data.likeCount || 0;
    document.getElementById('scrapCount').textContent = data.scrapCount || 0;
    document.getElementById('commentCountDisplay').textContent = data.commentCount || 0;
}

// --- 좋아요/스크랩 상태 확인 ---
async function checkUserActions(uid, pid) {
    const [likeSnap, scrapSnap] = await Promise.all([
        getDoc(doc(db, `users/${uid}/likes/${pid}`)),
        getDoc(doc(db, `users/${uid}/scraps/${pid}`))
    ]);
    isLiked = likeSnap.exists();
    isScrapped = scrapSnap.exists();
    document.getElementById('likeBtn').classList.toggle('active', isLiked);
    document.getElementById('scrapBtn').classList.toggle('active', isScrapped);
}

// --- 좋아요 토글 ---
async function toggleLike(pid, uid) {
    const likeRef = doc(db, `users/${uid}/likes/${pid}`);
    const postRef = doc(db, 'posts', pid);
    await runTransaction(db, async tx => {
        const likeSnap = await tx.get(likeRef);
        if (likeSnap.exists()) {
            tx.delete(likeRef);
            tx.update(postRef, { likeCount: increment(-1) });
            isLiked = false;
        } else {
            tx.set(likeRef, { likedAt: serverTimestamp() });
            tx.update(postRef, { likeCount: increment(1) });
            isLiked = true;
        }
    });
    const newCount = parseInt(document.getElementById('likeCount').textContent) + (isLiked ? 1 : -1);
    document.getElementById('likeCount').textContent = newCount;
    document.getElementById('likeBtn').classList.toggle('active', isLiked);
    return isLiked;
}

// --- 스크랩 토글 ---
async function toggleScrap(pid, uid) {
    const scrapRef = doc(db, `users/${uid}/scraps/${pid}`);
    const postRef = doc(db, 'posts', pid);
    await runTransaction(db, async tx => {
        const scrapSnap = await tx.get(scrapRef);
        if (scrapSnap.exists()) {
            tx.delete(scrapRef);
            tx.update(postRef, { scrapCount: increment(-1) });
            isScrapped = false;
        } else {
            tx.set(scrapRef, { scrappedAt: serverTimestamp() });
            tx.update(postRef, { scrapCount: increment(1) });
            isScrapped = true;
        }
    });
    const newCount = parseInt(document.getElementById('scrapCount').textContent) + (isScrapped ? 1 : -1);
    document.getElementById('scrapCount').textContent = newCount;
    document.getElementById('scrapBtn').classList.toggle('active', isScrapped);
    return isScrapped;
}

// --- 댓글 로드 ---
async function loadComments(pid) {
    const listEl = document.getElementById('commentsList');
    listEl.innerHTML = '';
    try {
        const snap = await getDocs(query(
            collection(db, `posts/${pid}/comments`),
            orderBy('createdAt', 'asc')
        ));
        snap.forEach(d => listEl.appendChild(buildCommentEl(pid, d.id, d.data())));
    } catch (e) { console.error('Comments load error:', e); }
}

function buildCommentEl(pid, commentId, data) {
    const el = document.createElement('div');
    el.className = 'comment-item';
    const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('ko-KR') : '';

    const avatarHtml = data.profilePhotoURL
        ? `<div class="comment-avatar" style="background-image:url(${data.profilePhotoURL})"></div>`
        : `<div class="comment-avatar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg></div>`;

    el.innerHTML = `
        <div class="comment-header">
          ${avatarHtml}
          <span class="comment-author">${escHtml(data.nickname || '')}</span>
          <span class="comment-date">${date}</span>
        </div>
        <p class="comment-body">${escHtml(data.content || '')}</p>
    `;

    // 본인 댓글만 삭제 가능
    if (currentUser && currentUser.uid === data.uid) {
        const delBtn = document.createElement('button');
        delBtn.className = 'comment-delete-btn link-btn';
        delBtn.textContent = '삭제';
        delBtn.addEventListener('click', async () => {
            if (!confirm('댓글을 삭제하시겠습니까?')) return;
            try {
                await deleteDoc(doc(db, `posts/${pid}/comments/${commentId}`));
                await runTransaction(db, async tx => {
                    tx.update(doc(db, 'posts', pid), { commentCount: increment(-1) });
                });
                el.remove();
                const countEl = document.getElementById('commentCountDisplay');
                countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
            } catch (e) { console.error('Comment delete error:', e); }
        });
        el.querySelector('.comment-header').appendChild(delBtn);
    }
    return el;
}

// --- 댓글 작성 ---
async function submitComment(pid, content) {
    if (!currentUser) { openAuthModal(); return; }
    const profile = await getUserProfile(currentUser.uid);
    const newDoc = await addDoc(collection(db, `posts/${pid}/comments`), {
        uid: currentUser.uid,
        nickname: profile?.nickname || currentUser.displayName || '',
        profilePhotoURL: profile?.profilePhotoURL || null,
        content,
        createdAt: serverTimestamp()
    });
    await runTransaction(db, async tx => {
        tx.update(doc(db, 'posts', pid), { commentCount: increment(1) });
    });
    const countEl = document.getElementById('commentCountDisplay');
    countEl.textContent = parseInt(countEl.textContent) + 1;

    // 새 댓글 렌더
    const commentData = {
        uid: currentUser.uid,
        nickname: profile?.nickname || currentUser.displayName || '',
        profilePhotoURL: profile?.profilePhotoURL || null,
        content,
        createdAt: null
    };
    document.getElementById('commentsList').appendChild(buildCommentEl(pid, newDoc.id, commentData));
    document.getElementById('commentInput').value = '';
}

// --- 게시글 삭제 ---
async function deletePost(pid, imageURLs) {
    if (!confirm('게시글을 삭제하시겠습니까? 댓글과 이미지도 함께 삭제됩니다.')) return;
    try {
        // Storage 이미지 삭제
        try {
            const storageRef = ref(storage, `posts/${pid}/images`);
            const list = await listAll(storageRef);
            await Promise.allSettled(list.items.map(item => deleteObject(item)));
        } catch (e) { /* Storage 삭제 실패는 무시 */ }

        // 댓글 서브컬렉션 삭제
        const commentsSnap = await getDocs(collection(db, `posts/${pid}/comments`));
        await Promise.allSettled(commentsSnap.docs.map(d => deleteDoc(d.ref)));

        // 게시글 Firestore 문서 삭제
        await deleteDoc(doc(db, 'posts', pid));
        location.href = '/community.html';
    } catch (e) {
        console.error('Post delete error:', e);
        alert('삭제 중 오류가 발생했습니다.');
    }
}

// --- 이벤트 바인딩 ---
document.getElementById('likeBtn').addEventListener('click', () => {
    if (!currentUser) { openAuthModal(); return; }
    toggleLike(postId, currentUser.uid);
});

document.getElementById('scrapBtn').addEventListener('click', () => {
    if (!currentUser) { openAuthModal(); return; }
    toggleScrap(postId, currentUser.uid);
});

document.getElementById('commentForm').addEventListener('submit', async e => {
    e.preventDefault();
    const content = document.getElementById('commentInput').value.trim();
    if (!content) return;
    const btn = document.getElementById('commentSubmitBtn');
    btn.disabled = true;
    try {
        await submitComment(postId, content);
    } finally {
        btn.disabled = false;
    }
});

document.getElementById('commentLoginBtn')?.addEventListener('click', openAuthModal);

document.getElementById('postDeleteBtn').addEventListener('click', () => {
    deletePost(postId, postData?.images || []);
});

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- 인증 + 초기화 ---
initAuth();

onAuthStateChanged(auth, async user => {
    const isVerified = user && (user.emailVerified || user.providerData.some(p => p.providerId === 'google.com'));
    currentUser = isVerified ? user : null;

    // 댓글 입력 폼 표시 토글
    const commentForm = document.getElementById('commentForm');
    const commentLoginMsg = document.getElementById('commentLoginMsg');
    if (currentUser) {
        commentForm.style.display = 'flex';
        commentLoginMsg.style.display = 'none';
    } else {
        commentForm.style.display = 'none';
        commentLoginMsg.style.display = 'block';
    }

    // 삭제 버튼
    if (postData && currentUser && currentUser.uid === postData.uid) {
        document.getElementById('postDeleteBtn').style.display = 'inline-block';
    }

    // 좋아요/스크랩 상태 확인
    if (currentUser && postId) {
        await checkUserActions(currentUser.uid, postId);
    }
});

// 페이지 로드
if (postId) {
    loadPost(postId);
} else {
    showNotFound();
}
