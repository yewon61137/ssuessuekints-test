// mypage.js

import { auth, db, storage, initAuth, getUserProfile, updateUserProfile, checkNicknameAvailable } from './auth.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { collection, query, where, getDocs, orderBy, doc, getDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { ref, deleteObject } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

// --- URL 파라미터 ---
const targetUid = new URLSearchParams(location.search).get('uid');

// --- DOM 요소 ---
const notLoggedIn = document.getElementById('notLoggedIn');
const loggedIn = document.getElementById('loggedIn');
const profileNicknameMain = document.getElementById('profileNicknameMain');
const profileBioMain = document.getElementById('profileBioMain');
const profileAvatarMain = document.getElementById('profileAvatarMain');
const patternCountEl = document.getElementById('patternCount');
const postCountEl = document.getElementById('postCount');

const mypageTabs = document.getElementById('mypageTabs');
const panels = {
    profile: document.getElementById('panelProfile'),
    mypatterns: document.getElementById('panelMyPatterns'),
    myposts: document.getElementById('panelMyPosts'),
    scraps: document.getElementById('panelScraps')
};

const editNicknameInput = document.getElementById('editNickname');
const editBioInput = document.getElementById('editBio');
const editRealNameInput = document.getElementById('editRealName');
const editAvatarPreview = document.getElementById('editAvatarPreview');
const editPhotoInput = document.getElementById('editPhotoInput');
const editNicknameStatus = document.getElementById('editNicknameStatus');
const profileEditMsg = document.getElementById('profileEditMsg');
const profileEditForm = document.getElementById('profileEditForm');

// --- 상태 관리 ---
let currentUser = null;
let currentProfile = null;
let isNicknameChecked = true;

// 헤더 인증 UI 초기화 (로그인/로그아웃 버튼 등)
initAuth();

// --- 초기화 및 인증 감지 ---
onAuthStateChanged(auth, async (user) => {
    const isVerified = user && (user.emailVerified || user.providerData.some(p => p.providerId !== 'password'));
    currentUser = isVerified ? user : null;

    const viewUid = targetUid || currentUser?.uid;

    if (!viewUid) {
        // 비로그인 + ?uid= 없음 → 로그인 유도
        loggedIn.style.display = 'none';
        notLoggedIn.style.display = 'block';
        return;
    }

    const isOwnProfile = !targetUid || (currentUser && targetUid === currentUser.uid);

    notLoggedIn.style.display = 'none';
    loggedIn.style.display = 'block';

    // 타인 프로필 → 편집 탭, 스크랩 탭 숨김
    const editTabBtn = document.getElementById('editProfileTabBtn');
    const scrapsTabBtn = document.querySelector('[data-tab="scraps"]');
    if (!isOwnProfile) {
        if (editTabBtn) editTabBtn.style.display = 'none';
        if (scrapsTabBtn) scrapsTabBtn.style.display = 'none';
        if (panels.scraps) panels.scraps.style.display = 'none';
    }

    await loadUserProfile(viewUid, isOwnProfile);
    loadActivityStats(viewUid);
    loadMyPatterns(viewUid, isOwnProfile);
    loadMyPosts(viewUid);
    if (isOwnProfile) loadScraps();
});

// --- 프로필 정보 로드 ---
async function loadUserProfile(uid, isOwnProfile) {
    const profile = await getUserProfile(uid);
    if (!profile) return;

    if (isOwnProfile) currentProfile = profile;

    profileNicknameMain.textContent = profile.nickname || 'NICKNAME';
    profileBioMain.textContent = profile.bio || '자기소개가 없습니다.';

    if (profile.profilePhotoURL) {
        profileAvatarMain.style.backgroundImage = `url(${profile.profilePhotoURL})`;
        profileAvatarMain.style.backgroundSize = 'cover';
        profileAvatarMain.innerHTML = '';
    }

    // 편집 폼은 본인 프로필일 때만 채움
    if (isOwnProfile) {
        if (profile.profilePhotoURL && editAvatarPreview) {
            editAvatarPreview.style.backgroundImage = `url(${profile.profilePhotoURL})`;
            editAvatarPreview.style.backgroundSize = 'cover';
            editAvatarPreview.innerHTML = '';
        }
        if (editNicknameInput) editNicknameInput.value = profile.nickname || '';
        if (editBioInput) editBioInput.value = profile.bio || '';
        if (editRealNameInput) editRealNameInput.value = profile.displayName || '';
    }
}

// --- 활동 통계 로드 ---
async function loadActivityStats(uid) {
    if (!uid) return;
    try {
        const patternsSnap = await getDocs(collection(db, `users/${uid}/patterns`));
        patternCountEl.textContent = patternsSnap.size;

        const postsSnap = await getDocs(query(collection(db, 'posts'), where('uid', '==', uid)));
        postCountEl.textContent = postsSnap.size;
    } catch (e) {
        console.error('Stats load failed:', e);
    }
}

// --- 탭 전환 로직 ---
mypageTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.mypage-tab');
    if (!tab) return;

    const targetTab = tab.getAttribute('data-tab');
    
    // 탭 활성화 상태 변경
    document.querySelectorAll('.mypage-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // 패널 가시성 변경
    Object.keys(panels).forEach(key => {
        if (key === targetTab) {
            panels[key].classList.add('active');
            panels[key].style.display = 'block';
        } else {
            panels[key].classList.remove('active');
            panels[key].style.display = 'none';
        }
    });
});

// --- 프로필 편집 로직 ---

// 닉네임 입력 시 중복확인 초기화
editNicknameInput.addEventListener('input', () => {
    if (editNicknameInput.value === currentProfile?.nickname) {
        isNicknameChecked = true;
        editNicknameStatus.style.display = 'none';
    } else {
        isNicknameChecked = false;
        editNicknameStatus.textContent = '중복 확인이 필요합니다.';
        editNicknameStatus.className = 'nickname-status error';
        editNicknameStatus.style.display = 'block';
    }
});

// 닉네임 중복 확인
document.getElementById('editCheckNicknameBtn').addEventListener('click', async () => {
    const nickname = editNicknameInput.value.trim();
    if (nickname === currentProfile?.nickname) return;

    if (nickname.length < 2) {
        editNicknameStatus.textContent = '닉네임은 2자 이상이어야 합니다.';
        editNicknameStatus.className = 'nickname-status error';
        editNicknameStatus.style.display = 'block';
        return;
    }

    try {
        const available = await checkNicknameAvailable(nickname);
        if (available) {
            isNicknameChecked = true;
            editNicknameStatus.textContent = '사용 가능한 닉네임입니다.';
            editNicknameStatus.className = 'nickname-status success';
        } else {
            isNicknameChecked = false;
            editNicknameStatus.textContent = '이미 사용 중인 닉네임입니다.';
            editNicknameStatus.className = 'nickname-status error';
        }
        editNicknameStatus.style.display = 'block';
    } catch (e) {
        console.error(e);
    }
});

// 사진 선택 시 프리뷰
editPhotoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
        editAvatarPreview.style.backgroundImage = `url(${ev.target.result})`;
        editAvatarPreview.style.backgroundSize = 'cover';
        editAvatarPreview.innerHTML = '';
    };
    reader.readAsDataURL(file);
});

// 프로필 저장
profileEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isNicknameChecked) {
        alert('닉네임 중복 확인을 해주세요.');
        return;
    }

    const saveBtn = document.getElementById('profileEditSaveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';

    try {
        await updateUserProfile(currentUser.uid, {
            nickname: editNicknameInput.value.trim(),
            currentNickname: currentProfile?.nickname,
            realName: editRealNameInput.value.trim(),
            bio: editBioInput.value.trim(),
            photoFile: editPhotoInput.files[0]
        });

        profileEditMsg.textContent = '성공적으로 저장되었습니다.';
        profileEditMsg.className = 'nickname-status success';
        profileEditMsg.style.display = 'block';
        
        await loadUserProfile(); // 정보 갱신
        loadActivityStats(); // 통계 갱신
        
        setTimeout(() => {
            profileEditMsg.style.display = 'none';
        }, 3000);
    } catch (err) {
        profileEditMsg.textContent = '저장 중 오류가 발생했습니다: ' + err.message;
        profileEditMsg.className = 'nickname-status error';
        profileEditMsg.style.display = 'block';
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '변경사항 저장';
    }
});

// --- 내 도안 로드 로직 ---
async function loadMyPatterns(uid, isOwnProfile) {
    const grid = document.getElementById('patternGrid');
    const loading = document.getElementById('loadingMsg');
    const empty = document.getElementById('emptyMsg');

    try {
        const q = query(collection(db, `users/${uid}/patterns`), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);

        loading.style.display = 'none';
        grid.innerHTML = '';

        if (snap.empty) { empty.style.display = 'block'; return; }

        empty.style.display = 'none';
        snap.forEach(docSnap => {
            grid.appendChild(createPatternCard(docSnap.id, docSnap.data(), uid, isOwnProfile));
        });
    } catch (e) {
        console.error(e);
        loading.textContent = '도안을 불러오는 중 오류가 발생했습니다.';
    }
}

function createPatternCard(id, data, uid, isOwnProfile) {
    const card = document.createElement('div');
    card.className = 'pattern-card';
    const dateStr = data.createdAt?.toDate().toLocaleDateString() || '';

    card.innerHTML = `
        <img src="${data.patternImageURL}" class="pattern-card-thumb" alt="${data.title}">
        <div class="pattern-card-body">
            <h3 class="pattern-card-name">${data.title}</h3>
            <p class="pattern-card-meta">${data.stitches}x${data.rows} | ${data.widthCm}cm | ${dateStr}</p>
            ${isOwnProfile ? `<div class="pattern-card-actions">
                <button class="small-btn download-btn">PDF</button>
                <button class="small-btn delete-btn">삭제</button>
            </div>` : ''}
        </div>
    `;

    if (isOwnProfile) {
        card.querySelector('.delete-btn').addEventListener('click', async () => {
            if (confirm('정말 삭제하시겠습니까?')) {
                const basePath = `users/${uid}/patterns/${id}`;
                await Promise.allSettled([
                    deleteObject(ref(storage, `${basePath}/pattern.png`)),
                    deleteObject(ref(storage, `${basePath}/original.jpg`))
                ]);
                await deleteDoc(doc(db, `users/${uid}/patterns`, id));
                card.remove();
                loadActivityStats(uid);
            }
        });
    }

    return card;
}

// --- 내 글 로드 ---
async function loadMyPosts(uid) {
    const grid = document.getElementById('myPostsGrid');
    const loading = document.getElementById('myPostsLoading');
    const empty = document.getElementById('myPostsEmpty');
    if (!grid || !uid) return;

    try {
        const q = query(collection(db, 'posts'), where('uid', '==', uid), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        loading.style.display = 'none';
        grid.innerHTML = '';
        if (snap.empty) { empty.style.display = 'block'; return; }
        empty.style.display = 'none';
        snap.forEach(docSnap => {
            grid.appendChild(createPostCard(docSnap.id, docSnap.data()));
        });
    } catch (e) {
        console.error(e);
        loading.textContent = '게시글을 불러오는 중 오류가 발생했습니다.';
    }
}

// --- 스크랩 로드 ---
async function loadScraps() {
    const grid = document.getElementById('scrapsGrid');
    const loading = document.getElementById('scrapsLoading');
    const empty = document.getElementById('scrapsEmpty');
    if (!grid) return;

    try {
        const scrapsSnap = await getDocs(collection(db, `users/${currentUser.uid}/scraps`));
        loading.style.display = 'none';
        grid.innerHTML = '';
        if (scrapsSnap.empty) { empty.style.display = 'block'; return; }

        const postDocs = await Promise.all(
            scrapsSnap.docs.map(s => getDoc(doc(db, 'posts', s.id)))
        );
        const valid = postDocs.filter(d => d.exists());
        if (!valid.length) { empty.style.display = 'block'; return; }
        empty.style.display = 'none';
        valid.forEach(d => grid.appendChild(createPostCard(d.id, d.data())));
    } catch (e) {
        console.error(e);
        loading.textContent = '스크랩을 불러오는 중 오류가 발생했습니다.';
    }
}

function createPostCard(id, data) {
    const card = document.createElement('div');
    card.className = 'pattern-card';
    const thumb = data.images?.[0] || data.patternImageURL || '';
    const dateStr = data.createdAt?.toDate().toLocaleDateString('ko-KR') || '';
    card.innerHTML = `
        ${thumb ? `<img src="${thumb}" class="pattern-card-thumb" alt="${data.title}" onerror="this.style.display='none'">` : '<div class="pattern-card-thumb no-thumb"></div>'}
        <div class="pattern-card-body">
            <h3 class="pattern-card-name">${data.title || ''}</h3>
            <p class="pattern-card-meta">${dateStr} · 좋아요 ${data.likeCount || 0}</p>
        </div>
    `;
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => { window.location.href = `/post.html?id=${id}`; });
    return card;
}

// 로그인 버튼 연결
const gotoSignInBtn = document.getElementById('gotoSignInBtn');
if (gotoSignInBtn) {
    gotoSignInBtn.addEventListener('click', () => {
        import('./auth.js').then(m => m.openAuthModal());
    });
}
