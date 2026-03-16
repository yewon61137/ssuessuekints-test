// mypage.js

import { auth, db, storage, getCurrentUser, getUserProfile, updateUserProfile, checkNicknameAvailable } from './auth.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { collection, query, where, getDocs, orderBy, doc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

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
let isNicknameChecked = true; // 초기엔 본인 닉네임이므로 true

// --- 초기화 및 인증 감지 ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        notLoggedIn.style.display = 'none';
        loggedIn.style.display = 'block';
        
        await loadUserProfile();
        loadActivityStats();
        loadMyPatterns();
        loadMyPosts();
        loadScraps();
    } else {
        loggedIn.style.display = 'none';
        notLoggedIn.style.display = 'block';
    }
});

// --- 프로필 정보 로드 ---
async function loadUserProfile() {
    if (!currentUser) return;
    
    currentProfile = await getUserProfile(currentUser.uid);
    if (currentProfile) {
        // 메인 영역 업데이트
        profileNicknameMain.textContent = currentProfile.nickname || 'NICKNAME';
        profileBioMain.textContent = currentProfile.bio || '자기소개가 없습니다.';
        
        if (currentProfile.profilePhotoURL) {
            profileAvatarMain.style.backgroundImage = `url(${currentProfile.profilePhotoURL})`;
            profileAvatarMain.style.backgroundSize = 'cover';
            profileAvatarMain.innerHTML = '';
            
            editAvatarPreview.style.backgroundImage = `url(${currentProfile.profilePhotoURL})`;
            editAvatarPreview.style.backgroundSize = 'cover';
            editAvatarPreview.innerHTML = '';
        }

        // 편집 폼 업데이트
        editNicknameInput.value = currentProfile.nickname || '';
        editBioInput.value = currentProfile.bio || '';
        editRealNameInput.value = currentProfile.displayName || '';
    }
}

// --- 활동 통계 로드 ---
async function loadActivityStats() {
    if (!currentUser) return;

    try {
        // 1. 도안 수
        const patternsSnap = await getDocs(collection(db, `users/${currentUser.uid}/patterns`));
        patternCountEl.textContent = patternsSnap.size;

        // 2. 내가 쓴 글 수
        const postsQuery = query(collection(db, 'posts'), where('authorId', '==', currentUser.uid));
        const postsSnap = await getDocs(postsQuery);
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
async function loadMyPatterns() {
    const grid = document.getElementById('patternGrid');
    const loading = document.getElementById('loadingMsg');
    const empty = document.getElementById('emptyMsg');

    try {
        const q = query(collection(db, `users/${currentUser.uid}/patterns`), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);

        loading.style.display = 'none';
        grid.innerHTML = '';

        if (snap.empty) {
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const card = createPatternCard(docSnap.id, data);
            grid.appendChild(card);
        });
    } catch (e) {
        console.error(e);
        loading.textContent = '도안을 불러오는 중 오류가 발생했습니다.';
    }
}

function createPatternCard(id, data) {
    const card = document.createElement('div');
    card.className = 'pattern-card';
    
    const dateStr = data.createdAt?.toDate().toLocaleDateString() || '';
    
    card.innerHTML = `
        <img src="${data.patternImageURL}" class="pattern-card-thumb" alt="${data.title}">
        <div class="pattern-card-body">
            <h3 class="pattern-card-name">${data.title}</h3>
            <p class="pattern-card-meta">${data.stitches}x${data.rows} | ${data.widthCm}cm | ${dateStr}</p>
            <div class="pattern-card-actions">
                <button class="small-btn download-btn">PDF</button>
                <button class="small-btn delete-btn">삭제</button>
            </div>
        </div>
    `;

    // 삭제 버튼 로직
    card.querySelector('.delete-btn').addEventListener('click', async () => {
        if (confirm('정말 삭제하시겠습니까?')) {
            await deleteDoc(doc(db, `users/${currentUser.uid}/patterns`, id));
            card.remove();
            loadActivityStats(); // 통계 갱신
        }
    });

    return card;
}

// --- 내 글 / 스크랩 로드 (기본 틀만 유지) ---
async function loadMyPosts() {
    const grid = document.getElementById('myPostsGrid');
    const loading = document.getElementById('myPostsLoading');
    const empty = document.getElementById('myPostsEmpty');
    
    // 여기에 게시글 로드 로직 구현 (필요 시)
    loading.style.display = 'none';
    empty.style.display = 'block';
}

async function loadScraps() {
    const grid = document.getElementById('scrapsGrid');
    const loading = document.getElementById('scrapsLoading');
    const empty = document.getElementById('scrapsEmpty');
    
    // 여기에 스크랩 로드 로직 구현 (필요 시)
    loading.style.display = 'none';
    empty.style.display = 'block';
}

// 로그인 버튼 연결
const gotoSignInBtn = document.getElementById('gotoSignInBtn');
if (gotoSignInBtn) {
    gotoSignInBtn.addEventListener('click', () => {
        import('./auth.js').then(m => m.openAuthModal());
    });
}
