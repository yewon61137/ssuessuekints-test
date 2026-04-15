// community.js — 커뮤니티 피드

import { auth, db, initAuth, openAuthModal, getUserProfile, showLoginRequiredToast } from './auth.js';
import { initLang, formatDate } from './i18n.js';
import { onAuthStateChanged } from './firebase-auth.js';
import {
    collection, query, orderBy, limit, getDocs, addDoc, setDoc,
    serverTimestamp, where, startAfter, doc, getDoc
} from './firebase-db.js';
import {
    storage, ref, uploadBytes, getDownloadURL
} from './firebase-storage.js';

const PAGE_SIZE = 12;
let currentTagFilter = '';
let isFollowingFilter = false;
let followedUids = [];
let localFollowFeed = [];
let localFollowIndex = 0;
let lastDoc = null;
let isLoading = false;
let currentUser = null;


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
        if (isFollowingFilter && followedUids.length === 0) {
            loadingEl.style.display = 'none';
            emptyEl.style.display = 'block';
            isLoading = false;
            return;
        }

        const uids = isFollowingFilter ? followedUids.slice(0, 30) : null;

        // 팔로우 필터가 적용 중이면 로컬에서 정렬 및 페이징 처리 (복합 인덱스 회피)
        if (isFollowingFilter) {
            if (!cursorDoc) {
                let q;
                if (tagFilter) {
                    q = query(collection(db, 'posts'), where('tags', 'array-contains', tagFilter), where('uid', 'in', uids));
                } else {
                    q = query(collection(db, 'posts'), where('uid', 'in', uids));
                }
                const snap = await getDocs(q);
                
                let tempResults = [];
                snap.forEach(docSnap => {
                    const data = docSnap.data();
                    if (data.isPublic === false) return;
                    tempResults.push({ id: docSnap.id, data });
                });
                
                // 날짜순 내림차순 정렬 (JS 로컬)
                tempResults.sort((a, b) => {
                    const tA = a.data.createdAt?.toMillis ? a.data.createdAt.toMillis() : 0;
                    const tB = b.data.createdAt?.toMillis ? b.data.createdAt.toMillis() : 0;
                    return tB - tA;
                });
                
                localFollowFeed = tempResults;
                localFollowIndex = 0;
            }
            
            loadingEl.style.display = 'none';
            if (localFollowFeed.length === 0) {
                emptyEl.style.display = 'block';
                isLoading = false;
                return;
            }

            const pageItems = localFollowFeed.slice(localFollowIndex, localFollowIndex + PAGE_SIZE);
            pageItems.forEach(item => {
                gridEl.appendChild(renderPostCard(item.id, item.data));
            });
            
            localFollowIndex += PAGE_SIZE;

            if (localFollowIndex < localFollowFeed.length) {
                lastDoc = 'virtual'; 
                loadMoreArea.style.display = 'block';
            } else {
                lastDoc = null;
                loadMoreArea.style.display = 'none';
            }
            isLoading = false;
            return;
        }

        // 일반 쿼리
        let q;
        if (tagFilter) {
            q = query(collection(db, 'posts'), where('tags', 'array-contains', tagFilter), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
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
        loadingEl.textContent = '불러오기 실패. 잠시 후 다시 시도해주세요.';
    }
    isLoading = false;
}

function renderPostCard(postId, data) {
    const card = document.createElement('a');
    card.className = 'post-card';
    card.href = `/post.html?id=${postId}`;

    const date = formatDate(data.createdAt);
    const thumb = data.images && data.images[0]
        ? `<div class="post-card-thumb" style="background-image:url(${escHtml(data.images[0])})"></div>`
        : '<div class="post-card-thumb post-card-thumb-empty"></div>';
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

// --- 태그 필터 (태그 칩들) ---
document.getElementById('tagFilterRow').addEventListener('click', e => {
    const chip = e.target.closest('.tag-chip');
    if (!chip) return;
    
    // 팔로우 칩인 경우 이벤트 분리
    if (chip.id === 'followingFilterBtn') return;

    // 카테고리 태그 칩 처리
    document.querySelectorAll('.tag-chip:not(#followingFilterBtn)').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentTagFilter = chip.getAttribute('data-tag') || '';
    lastDoc = null;
    loadFeed(currentTagFilter, null);
});

// --- 팔로우 필터 토글 ---
const followingBtn = document.getElementById('followingFilterBtn');
if (followingBtn) {
    followingBtn.addEventListener('click', async () => {
        if (!currentUser) {
            showLoginRequiredToast();
            setTimeout(() => openAuthModal(), 300);
            return;
        }
        isFollowingFilter = !isFollowingFilter;
        followingBtn.classList.toggle('active', isFollowingFilter);
        
        if (isFollowingFilter) {
            // 내가 팔로우한 목록 가져오기
            try {
                const snap = await getDocs(query(collection(db, 'follows'), where('followerId', '==', currentUser.uid)));
                followedUids = snap.docs.map(doc => doc.data().followingId);
                // 빈 배열이라면 조회 자체를 즉시 멈추도록 loadFeed 상단에 방어 코드가 있으므로 안전합니다.
            } catch (err) {
                console.error(err);
                followedUids = [];
            }
        }
        
        lastDoc = null;
        loadFeed(currentTagFilter, null);
    });
}

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
    if (!currentUser) {
        showLoginRequiredToast();
        setTimeout(() => openAuthModal(), 300);
        return;
    }
    const canWrite = currentUser.emailVerified ||
        currentUser.providerData.some(p => p.providerId !== 'password') ||
        currentUser.providerData.length === 0;
    if (!canWrite) {
        alert('이메일 인증 후 글쓰기가 가능합니다. 메일함을 확인해주세요.');
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

async function handleImageSelect(e) {
    const idx = parseInt(e.target.getAttribute('data-idx'));
    const file = e.target.files[0];
    if (!file) return;

    // 보안 규칙 준수: 이미지 파일 검증
    const { validateFile } = await import('./auth.js');
    const v = validateFile(file);
    if (!v.valid) {
        alert(v.error);
        e.target.value = '';
        return;
    }

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

        // 새 게시글의 Firestore 참조 및 ID 생성
        const newPostRef = doc(collection(db, 'posts'));
        const postId = newPostRef.id;

        const uploadedURLs = [];
        for (let i = 0; i < 4; i++) {
            if (imageFiles[i]) {
                const imgRef = ref(storage, `posts/${postId}/images/${i}.jpg`);
                await uploadBytes(imgRef, imageFiles[i], { customMetadata: { ownerUid: user.uid } });
                uploadedURLs.push(await getDownloadURL(imgRef));
            }
        }

        await setDoc(newPostRef, {
            uid: user.uid,
            nickname: profile?.nickname || user.displayName || '',
            profilePhotoURL: profile?.profilePhotoURL || null,
            title,
            content,
            images: uploadedURLs,
            tags,
            isPublic: document.getElementById('writeIsPublic').checked,
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

// --- 초기화 ---
initLang();
initAuth();

onAuthStateChanged(auth, user => {
    currentUser = user || null;
});

// 페이지 로드 시 피드
loadFeed();
