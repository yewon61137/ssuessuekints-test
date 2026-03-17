// post.js — 게시글 상세 페이지

import { auth, db, storage, initAuth, openAuthModal, getUserProfile } from './auth.js?v=5';
import { initLang } from './i18n.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
    doc, getDoc, collection, query, orderBy, getDocs,
    addDoc, deleteDoc, updateDoc, serverTimestamp, runTransaction, increment
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { ref, deleteObject, listAll, getBlob } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

initLang();

// --- 상태 ---
const params = new URLSearchParams(location.search);
const postId = params.get('id');
let currentUser = null;
let postData = null;
let linkedPatternData = null;
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
    const date = data.createdAt
        ? new Date(data.createdAt.seconds * 1000).toLocaleString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';
    document.getElementById('postDate').textContent = date;
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

    // 연결 도안
    if (data.patternImageURL) {
        document.getElementById('postLinkedPattern').style.display = 'flex';
        const thumbEl = document.getElementById('postLinkedThumb');
        thumbEl.src = data.patternImageURL;
        thumbEl.addEventListener('click', () => window.open(data.patternImageURL, '_blank'));
        // PNG 기본 링크
        const pngBtn = document.getElementById('postLinkedPngBtn');
        if (pngBtn) pngBtn.href = data.patternImageURL;
        // 도안 세부 정보 로드 (patternId + uid 있을 때)
        if (data.patternId && data.uid) {
            loadLinkedPattern(data.uid, data.patternId);
        }
    }

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

function formatDate(ts) {
    if (!ts) return '';
    return new Date(ts.seconds * 1000).toLocaleString('ko-KR', {
        year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

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

// --- 연결 도안 세부 정보 로드 ---
async function loadLinkedPattern(uid, patternId) {
    try {
        const snap = await getDoc(doc(db, `users/${uid}/patterns/${patternId}`));
        if (!snap.exists()) return;
        linkedPatternData = snap.data();

        const titleEl = document.getElementById('postLinkedTitle');
        if (titleEl) titleEl.textContent = linkedPatternData.title || linkedPatternData.name || '';

        const metaEl = document.getElementById('postLinkedMeta');
        if (metaEl) {
            const parts = [];
            if (linkedPatternData.stitches && linkedPatternData.rows)
                parts.push(`${linkedPatternData.stitches}코 × ${linkedPatternData.rows}단`);
            if (linkedPatternData.widthCm && linkedPatternData.heightCm)
                parts.push(`${linkedPatternData.widthCm}cm × ${linkedPatternData.heightCm}cm`);
            else if (linkedPatternData.widthCm) parts.push(`${linkedPatternData.widthCm}cm`);
            if (linkedPatternData.yarnType) parts.push(linkedPatternData.yarnType);
            if (linkedPatternData.yarnMm) parts.push(`${linkedPatternData.yarnMm}mm`);
            metaEl.textContent = parts.join(' · ');
        }

        // PNG 링크 갱신 (patternImageURL이 있으면 교체)
        const pngBtn = document.getElementById('postLinkedPngBtn');
        if (pngBtn && linkedPatternData.patternImageURL)
            pngBtn.href = linkedPatternData.patternImageURL;

        // 다운로드 버튼 표시
        const actionsEl = document.getElementById('postLinkedActions');
        if (actionsEl) actionsEl.style.display = 'flex';
    } catch (e) {
        // 비공개 도안 등 권한 없으면 조용히 무시 (썸네일만 표시)
        console.log('Linked pattern details unavailable:', e.message);
    }
}

// 파일 다운로드 공통 헬퍼
// TODO: Google AdSense 승인 후 이 함수 호출 전 광고 모달 표시 로직 추가
async function downloadBlob(url, filename) {
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (e) {
        window.open(url, '_blank');
    }
}

// PDF 다운로드 (연결 도안) — getBlob() 우선(CORS 불필요), fetch 순으로 시도
document.getElementById('postLinkedPdfBtn').addEventListener('click', async () => {
    const data = linkedPatternData;
    if (!data) return;
    if (typeof window.jspdf === 'undefined') {
        alert('PDF 라이브러리를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
        return;
    }
    const { jsPDF } = window.jspdf;
    const imgUrl = data.patternImageURL || postData?.patternImageURL;
    if (!imgUrl) return;
    const safeName = (data.title || data.name || 'pattern').replace(/[^a-zA-Z0-9가-힣_-]/g, '_');

    // 이미지 소스 결정: patternBase64 → getBlob → fetch → 원본URL
    let blobUrl = null;
    let imgSrc;
    if (data.patternBase64) {
        imgSrc = data.patternBase64; // data URL, CORS 불필요
    } else {
        if (data.patternStoragePath) {
            try {
                const blob = await getBlob(ref(storage, data.patternStoragePath));
                blobUrl = URL.createObjectURL(blob);
            } catch (e) { /* fallback */ }
        }
        if (!blobUrl) {
            try {
                const res = await fetch(imgUrl);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const blob = await res.blob();
                blobUrl = URL.createObjectURL(blob);
            } catch (e) { /* fallback */ }
        }
        imgSrc = blobUrl || imgUrl;
    }

    const img = new Image();
    img.onload = () => {
        const cleanup = () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const maxW = pdfW - margin * 2;
        const maxH = pdfH - margin * 2 - 30;
        let finalW = maxW;
        let finalH = (img.height / img.width) * finalW;
        if (finalH > maxH) { finalH = maxH; finalW = (img.width / img.height) * finalH; }
        // 제목 (한글 포함 가능 — canvas에 그려서 이미지로 삽입)
        const titleText = data.title || data.name || 'Pattern';
        const titleCanvas = document.createElement('canvas');
        titleCanvas.width = 900;
        titleCanvas.height = 36;
        const tCtx = titleCanvas.getContext('2d');
        tCtx.font = '600 26px sans-serif';
        tCtx.fillStyle = '#000000';
        tCtx.fillText(titleText, 0, 26);
        pdf.addImage(titleCanvas.toDataURL('image/png'), 'PNG', margin, margin, maxW, maxW * 36 / 900);
        pdf.setFontSize(10);
        const sizeStr = (data.widthCm && data.heightCm)
            ? `${data.widthCm}cm × ${data.heightCm}cm`
            : (data.widthCm ? `${data.widthCm}cm` : '');
        const infoLine = [
            `${data.stitches || 0} Stitches × ${data.rows || 0} Rows`,
            sizeStr,
            data.yarnType || (data.yarnMm ? `${data.yarnMm}mm` : '')
        ].filter(Boolean).join('  |  ');
        pdf.text(infoLine, margin, margin + 13);
        try {
            const tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = img.width;
            tmpCanvas.height = img.height;
            tmpCanvas.getContext('2d').drawImage(img, 0, 0);
            const imgData = tmpCanvas.toDataURL('image/jpeg', 0.92);
            pdf.addImage(imgData, 'JPEG', margin, margin + 20, finalW, finalH);
        } catch (e) {
            pdf.setTextColor(120, 120, 120);
            pdf.text('* 도안 이미지는 PNG 버튼으로 별도 저장해주세요.', margin, margin + 25);
            pdf.setTextColor(0, 0, 0);
        }
        if (data.legendHTML) {
            pdf.addPage();
            pdf.setFontSize(12);
            pdf.text('Color Legend', margin, margin + 5);
            const tmpDiv = document.createElement('div');
            tmpDiv.innerHTML = data.legendHTML;
            let y = margin + 15;
            tmpDiv.querySelectorAll('.color-item').forEach(item => {
                const rgbMatch = item.querySelector('.color-box')?.style.backgroundColor.match(/\d+/g);
                if (rgbMatch) {
                    pdf.setFillColor(parseInt(rgbMatch[0]), parseInt(rgbMatch[1]), parseInt(rgbMatch[2]));
                    pdf.rect(margin, y, 8, 8, 'F');
                    pdf.setDrawColor(0); pdf.rect(margin, y, 8, 8, 'S');
                    pdf.setFontSize(9);
                    pdf.text(item.querySelector('span')?.textContent || '', margin + 12, y + 6);
                    y += 12;
                    if (y > pdfH - margin) y = margin;
                }
            });
        }
        pdf.save(`${safeName}.pdf`);
        cleanup();
    };
    img.onerror = () => {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        alert('이미지를 불러오지 못했습니다.');
    };
    img.src = imgSrc;
});

// PNG 직접 저장 (연결 도안)
document.getElementById('postLinkedPngBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    const data = linkedPatternData;
    const safeName = (data?.title || data?.name || postData?.title || 'pattern')
        .replace(/[^a-zA-Z0-9가-힣_-]/g, '_');

    // patternBase64 우선 (CORS 불필요)
    if (data?.patternBase64) {
        const a = document.createElement('a');
        a.href = data.patternBase64;
        a.download = `${safeName}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
    }

    const url = data?.patternImageURL || postData?.patternImageURL;
    if (!url) return;

    if (data?.patternStoragePath) {
        try {
            const blob = await getBlob(ref(storage, data.patternStoragePath));
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `${safeName}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
            return;
        } catch (e) { /* fallback */ }
    }
    downloadBlob(url, `${safeName}.png`);
});

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

    // 수정/삭제 버튼 (본인 글)
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
