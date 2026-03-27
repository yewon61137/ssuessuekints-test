// post.js — 게시글 상세 페이지

import { auth, db, storage, initAuth, openAuthModal, getUserProfile } from './auth.js';
import { initLang, formatDate } from './i18n.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
    doc, getDoc, collection, query, orderBy, getDocs,
    addDoc, deleteDoc, updateDoc, serverTimestamp, runTransaction, increment
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { ref, deleteObject, listAll } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

initLang();

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
    document.getElementById('postDate').textContent = formatDate(data.createdAt);
    if (data.uid) {
        document.getElementById('postAuthorLink').href = `/mypage.html?uid=${data.uid}`;
    }

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

    // 카운터
    document.getElementById('likeCount').textContent = data.likeCount || 0;
    document.getElementById('scrapCount').textContent = data.scrapCount || 0;
    document.getElementById('commentCountDisplay').textContent = data.commentCount || 0;

    // 수정/삭제 버튼 (본인 글) — onAuthStateChanged보다 loadPost가 늦게 완료될 수 있으므로 여기서도 체크
    if (currentUser && currentUser.uid === data.uid) {
        document.getElementById('postEditBtn').style.display = 'inline-block';
        document.getElementById('postDeleteBtn').style.display = 'inline-block';
    }
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

// formatDate -> i18n.js의 formatDate 사용 (상단 import 추가됨)

function makeAvatar(photoURL, size = 16) {
    return photoURL
        ? `<div class="comment-avatar" style="background-image:url(${photoURL})"></div>`
        : `<div class="comment-avatar"><svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg></div>`;
}

// --- 인라인 편집 헬퍼 ---
function attachInlineEdit(el, bodyEl, firestorePath, data) {
    const editBtn = document.createElement('button');
    editBtn.className = 'comment-edit-btn link-btn';
    editBtn.textContent = '수정';

    editBtn.addEventListener('click', () => {
        if (el.querySelector('.comment-edit-area')) return; // 이미 열려 있으면 무시
        const editArea = document.createElement('div');
        editArea.className = 'comment-edit-area';
        editArea.innerHTML = `
            <textarea class="reply-input" maxlength="500" rows="2"></textarea>
            <div class="reply-form-btns">
              <button type="button" class="edit-cancel-btn secondary-btn small-btn">취소</button>
              <button type="button" class="edit-save-btn primary-btn small-btn">저장</button>
            </div>
        `;
        editArea.querySelector('textarea').value = data.content;
        bodyEl.style.display = 'none';
        bodyEl.insertAdjacentElement('afterend', editArea);
        editArea.querySelector('textarea').focus();

        editArea.querySelector('.edit-cancel-btn').addEventListener('click', () => {
            editArea.remove();
            bodyEl.style.display = '';
        });

        editArea.querySelector('.edit-save-btn').addEventListener('click', async () => {
            const newContent = editArea.querySelector('textarea').value.trim();
            if (!newContent) return;
            const saveBtn = editArea.querySelector('.edit-save-btn');
            saveBtn.disabled = true;
            saveBtn.textContent = '저장 중...';
            try {
                await updateDoc(doc(db, firestorePath), { content: newContent, updatedAt: serverTimestamp() });
                data.content = newContent;
                bodyEl.textContent = newContent;
                bodyEl.style.display = '';
                editArea.remove();
            } catch (e) {
                console.error('Edit error:', e);
                alert('수정 중 오류가 발생했습니다.');
                saveBtn.disabled = false;
                saveBtn.textContent = '저장';
            }
        });
    });

    return editBtn;
}

function buildCommentEl(pid, commentId, data) {
    const el = document.createElement('div');
    el.className = 'comment-item';

    el.innerHTML = `
        <div class="comment-header">
          ${makeAvatar(data.profilePhotoURL)}
          <span class="comment-author">${escHtml(data.nickname || '')}</span>
          <span class="comment-date">${formatDate(data.createdAt)}</span>
        </div>
        <p class="comment-body">${escHtml(data.content || '')}</p>
        <div class="comment-footer"></div>
    `;

    const footerEl = el.querySelector('.comment-footer');

    // 답글 버튼
    const replyBtn = document.createElement('button');
    replyBtn.className = 'reply-btn link-btn';
    replyBtn.textContent = '답글';
    footerEl.appendChild(replyBtn);

    // 본인 댓글만 수정/삭제 가능
    if (currentUser && currentUser.uid === data.uid) {
        const editBtn = attachInlineEdit(el, el.querySelector('.comment-body'), `posts/${pid}/comments/${commentId}`, data);
        footerEl.appendChild(editBtn);

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
        footerEl.appendChild(delBtn);
    }

    // 답글 입력 폼
    const replyFormEl = document.createElement('div');
    replyFormEl.className = 'reply-form';
    replyFormEl.style.display = 'none';
    replyFormEl.innerHTML = `
        <textarea class="reply-input" placeholder="답글을 입력하세요 (최대 500자)" maxlength="500" rows="2"></textarea>
        <div class="reply-form-btns">
          <button type="button" class="reply-cancel-btn secondary-btn small-btn">취소</button>
          <button type="button" class="reply-submit-btn primary-btn small-btn">등록</button>
        </div>
    `;
    el.appendChild(replyFormEl);

    // 답글 목록
    const repliesContainer = document.createElement('div');
    repliesContainer.className = 'replies-container';
    el.appendChild(repliesContainer);

    // 답글 버튼 토글
    replyBtn.addEventListener('click', () => {
        if (!currentUser) { openAuthModal(); return; }
        const isOpen = replyFormEl.style.display !== 'none';
        replyFormEl.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) replyFormEl.querySelector('.reply-input').focus();
    });

    replyFormEl.querySelector('.reply-cancel-btn').addEventListener('click', () => {
        replyFormEl.style.display = 'none';
        replyFormEl.querySelector('.reply-input').value = '';
    });

    replyFormEl.querySelector('.reply-submit-btn').addEventListener('click', async () => {
        const content = replyFormEl.querySelector('.reply-input').value.trim();
        if (!content) return;
        const submitBtn = replyFormEl.querySelector('.reply-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = '등록 중...';
        try {
            const profile = await getUserProfile(currentUser.uid);
            const newRef = await addDoc(collection(db, `posts/${pid}/comments/${commentId}/replies`), {
                uid: currentUser.uid,
                nickname: profile?.nickname || currentUser.displayName || '',
                profilePhotoURL: profile?.profilePhotoURL || null,
                content,
                createdAt: serverTimestamp()
            });
            repliesContainer.appendChild(buildReplyEl(pid, commentId, newRef.id, {
                uid: currentUser.uid,
                nickname: profile?.nickname || currentUser.displayName || '',
                profilePhotoURL: profile?.profilePhotoURL || null,
                content,
                createdAt: { seconds: Math.floor(Date.now() / 1000) }
            }));
            replyFormEl.querySelector('.reply-input').value = '';
            replyFormEl.style.display = 'none';
        } catch (e) {
            console.error('Reply submit error:', e);
            alert('답글 등록 중 오류가 발생했습니다.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '등록';
        }
    });

    // 기존 답글 로드
    loadReplies(pid, commentId, repliesContainer);

    return el;
}

// --- 답글 로드 ---
async function loadReplies(pid, commentId, container) {
    try {
        const snap = await getDocs(query(
            collection(db, `posts/${pid}/comments/${commentId}/replies`),
            orderBy('createdAt', 'asc')
        ));
        snap.forEach(d => container.appendChild(buildReplyEl(pid, commentId, d.id, d.data())));
    } catch (e) { console.error('Replies load error:', e); }
}

function buildReplyEl(pid, commentId, replyId, data) {
    const el = document.createElement('div');
    el.className = 'reply-item';

    el.innerHTML = `
        <div class="comment-header">
          ${makeAvatar(data.profilePhotoURL)}
          <span class="comment-author">${escHtml(data.nickname || '')}</span>
          <span class="comment-date">${formatDate(data.createdAt)}</span>
        </div>
        <p class="comment-body">${escHtml(data.content || '')}</p>
    `;

    if (currentUser && currentUser.uid === data.uid) {
        const footerEl = document.createElement('div');
        footerEl.className = 'comment-footer';

        const editBtn = attachInlineEdit(el, el.querySelector('.comment-body'), `posts/${pid}/comments/${commentId}/replies/${replyId}`, data);
        footerEl.appendChild(editBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'comment-delete-btn link-btn';
        delBtn.textContent = '삭제';
        delBtn.addEventListener('click', async () => {
            if (!confirm('답글을 삭제하시겠습니까?')) return;
            try {
                await deleteDoc(doc(db, `posts/${pid}/comments/${commentId}/replies/${replyId}`));
                el.remove();
            } catch (e) { console.error('Reply delete error:', e); }
        });
        footerEl.appendChild(delBtn);
        el.appendChild(footerEl);
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
        createdAt: { seconds: Math.floor(Date.now() / 1000) }
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

        // 댓글 및 대댓글 서브컬렉션 삭제
        const commentsSnap = await getDocs(collection(db, `posts/${pid}/comments`));
        for (const commentDoc of commentsSnap.docs) {
            const repliesSnap = await getDocs(collection(db, `posts/${pid}/comments/${commentDoc.id}/replies`));
            await Promise.allSettled(repliesSnap.docs.map(r => deleteDoc(r.ref)));
            await deleteDoc(commentDoc.ref);
        }

        // 게시글 Firestore 문서 삭제
        await deleteDoc(doc(db, 'posts', pid));
        location.href = '/community.html';
    } catch (e) {
        console.error('Post delete error:', e);
        alert('삭제 중 오류가 발생했습니다.');
    }
}

// --- 게시글 수정 ---
function openEditModal(data) {
    document.getElementById('editPostTitle').value = data.title || '';
    document.getElementById('editPostContent').value = data.content || '';
    document.querySelectorAll('input[name="editTag"]').forEach(cb => {
        cb.checked = (data.tags || []).includes(cb.value);
    });
    document.getElementById('editPostIsPublic').checked = data.isPublic !== false;
    document.getElementById('editPostError').style.display = 'none';
    document.getElementById('editPostSubmit').disabled = false;
    document.getElementById('editPostSubmit').textContent = '저장';
    document.getElementById('editPostModal').style.display = 'flex';
}

document.getElementById('editPostModalClose').addEventListener('click', () => {
    document.getElementById('editPostModal').style.display = 'none';
});
document.getElementById('editPostCancel').addEventListener('click', () => {
    document.getElementById('editPostModal').style.display = 'none';
});
document.getElementById('editPostModal').addEventListener('click', e => {
    if (e.target === document.getElementById('editPostModal')) {
        document.getElementById('editPostModal').style.display = 'none';
    }
});

document.getElementById('editPostForm').addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = document.getElementById('editPostSubmit');
    const errorEl = document.getElementById('editPostError');
    submitBtn.disabled = true;
    submitBtn.textContent = '저장 중...';
    errorEl.style.display = 'none';
    try {
        const title = document.getElementById('editPostTitle').value.trim();
        const content = document.getElementById('editPostContent').value.trim();
        const tags = Array.from(document.querySelectorAll('input[name="editTag"]:checked')).map(cb => cb.value);
        const isPublic = document.getElementById('editPostIsPublic').checked;
        await updateDoc(doc(db, 'posts', postId), { title, content, tags, isPublic, updatedAt: serverTimestamp() });
        // 로컬 상태 업데이트
        postData = { ...postData, title, content, tags, isPublic };
        // 화면 리렌더
        document.getElementById('postTitle').textContent = title;
        document.title = `${title} | SSUESSUE KNITS`;
        document.getElementById('postBody').textContent = content;
        document.getElementById('postTags').innerHTML = tags.map(tag => `<span class="post-card-tag">${escHtml(tag)}</span>`).join('');
        document.getElementById('editPostModal').style.display = 'none';
    } catch (err) {
        console.error('Post edit error:', err);
        const msg = err.code === 'permission-denied'
            ? '권한 없음: Firestore 규칙에 update 허용이 필요합니다.'
            : `수정 오류: ${err.message || err.code || '알 수 없는 오류'}`;
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = '저장';
    }
});

// --- 이벤트 바인딩 ---
document.getElementById('likeBtn').addEventListener('click', async () => {
    if (!currentUser) { openAuthModal(); return; }
    try { await toggleLike(postId, currentUser.uid); }
    catch (e) { console.error('Like error:', e); }
});

document.getElementById('scrapBtn').addEventListener('click', async () => {
    if (!currentUser) { openAuthModal(); return; }
    try { await toggleScrap(postId, currentUser.uid); }
    catch (e) { console.error('Scrap error:', e); }
});

const _shareBtn = document.getElementById('shareBtn');
if (_shareBtn) {
    _shareBtn.addEventListener('click', () => {
        const url  = location.href;
        const lbl  = _shareBtn.querySelector('.share-label');
        const lang = document.documentElement.lang || 'ko';
        const OK   = { ko: '링크 복사됨!', en: 'Link copied!', ja: 'コピー済！' };
        const ORIG = { ko: '공유', en: 'Share', ja: 'シェア' };

        function showCopied() {
            if (lbl) { lbl.textContent = OK[lang] || OK.ko; }
            setTimeout(() => { if (lbl) lbl.textContent = ORIG[lang] || ORIG.ko; }, 2000);
        }
        function execCopy() {
            try {
                const ta = Object.assign(document.createElement('textarea'), {
                    value: url, style: 'position:fixed;opacity:0;'
                });
                document.body.appendChild(ta);
                ta.focus(); ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                showCopied();
            } catch (e) { /* silent */ }
        }
        function clipCopy() {
            navigator.clipboard.writeText(url).then(showCopied).catch(execCopy);
        }

        if (navigator.share) {
            navigator.share({ title: document.title, url }).catch(e => {
                if (e.name !== 'AbortError') clipCopy();
            });
        } else if (navigator.clipboard) {
            clipCopy();
        } else {
            execCopy();
        }
    });
}

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

document.getElementById('postEditBtn').addEventListener('click', () => {
    if (postData) openEditModal(postData);
});

document.getElementById('postDeleteBtn').addEventListener('click', () => {
    deletePost(postId, postData?.images || []);
});

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- 인증 + 초기화 ---
initAuth();

onAuthStateChanged(auth, async user => {
    currentUser = user || null;

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

    // 본인 글인 경우 수정/삭제 버튼 표시
    if (postData && currentUser && currentUser.uid === postData.uid) {
        document.getElementById('postEditBtn').style.display = 'inline-block';
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
