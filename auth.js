// auth.js — Firebase 초기화 + 인증 + 도안 저장 + 프로필 관리
// Firebase 10 CDN ES 모듈 사용 (빌드 불필요)

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp,
    doc,
    getDoc,
    setDoc
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

// ⚠️ firebase-config.js 파일에서 설정을 수정하세요
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export function getCurrentUser() {
    return auth.currentUser;
}

// 닉네임 유효성 검사 (한글·영문·숫자·_ 2~20자)
function isValidNickname(nickname) {
    return /^[a-zA-Z0-9가-힣_]{2,20}$/.test(nickname);
}

// 닉네임 사용 가능 여부 확인 (Firestore usernames 컬렉션)
export async function checkNicknameAvailable(nickname) {
    const snap = await getDoc(doc(db, 'usernames', nickname));
    return !snap.exists();
}

// 사용자 프로필 완성 여부 확인
async function isProfileComplete(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() && snap.data().profileCompleted === true;
}

// 사용자 프로필 저장 (Firestore + Storage)
async function saveUserProfile(user, nickname, realName, photoFile) {
    // 1. 프로필 사진: 새 파일 업로드 또는 Google 사진 URL 사용
    let profilePhotoURL = user.photoURL || null;
    if (photoFile) {
        const photoRef = ref(storage, `users/${user.uid}/profile/avatar.jpg`);
        await uploadBytes(photoRef, photoFile);
        profilePhotoURL = await getDownloadURL(photoRef);
    }

    // 2. Firestore users/{uid} 저장
    await setDoc(doc(db, 'users', user.uid), {
        nickname,
        displayName: realName || null,
        profilePhotoURL,
        email: user.email || null,
        joinedAt: serverTimestamp(),
        profileCompleted: true
    });

    // 3. usernames/{nickname} 예약 (중복 방지)
    await setDoc(doc(db, 'usernames', nickname), { uid: user.uid });

    // 4. Firebase Auth displayName을 닉네임으로 업데이트
    await updateProfile(user, { displayName: nickname });
}

// --- 프로필 설정 패널 상태 ---
let pendingProfileUser = null;
let nicknameChecked = false;
let nicknameAvailable = false;

function showProfileSetup(user) {
    pendingProfileUser = user;
    nicknameChecked = false;
    nicknameAvailable = false;

    const modal = document.getElementById('authModal');
    // 탭·Google 버튼·구분선 숨기기
    modal.querySelector('.modal-tabs').style.display = 'none';
    modal.querySelector('.google-btn').style.display = 'none';
    modal.querySelector('.modal-divider').style.display = 'none';
    document.getElementById('signinPanel').style.display = 'none';
    document.getElementById('signupPanel').style.display = 'none';

    const panel = document.getElementById('profileSetupPanel');
    panel.style.display = 'block';
    clearModalError();

    const saveBtn = document.getElementById('profileSaveBtn');
    const statusEl = document.getElementById('nicknameStatus');
    const nicknameInput = document.getElementById('profileNickname');
    const realNameInput = document.getElementById('profileRealName');
    const photoPreview = document.getElementById('profilePhotoPreview');

    saveBtn.disabled = true;
    saveBtn.textContent = '완료';
    statusEl.style.display = 'none';
    nicknameInput.value = '';
    realNameInput.value = '';

    // Google 계정 정보 사전 입력
    if (user.displayName) {
        const sanitized = user.displayName.replace(/[^a-zA-Z0-9가-힣_]/g, '').slice(0, 20);
        nicknameInput.value = sanitized;
        realNameInput.value = user.displayName;
    }

    // Google 프로필 사진 미리보기
    if (user.photoURL) {
        photoPreview.style.backgroundImage = `url(${user.photoURL})`;
        photoPreview.style.backgroundSize = 'cover';
        photoPreview.style.backgroundPosition = 'center';
        photoPreview.innerHTML = '';
    } else {
        photoPreview.style.backgroundImage = '';
        photoPreview.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
    }

    // 모달 표시
    modal.style.display = 'flex';
}

function hideProfileSetupUI() {
    const modal = document.getElementById('authModal');
    modal.querySelector('.modal-tabs').style.display = '';
    modal.querySelector('.google-btn').style.display = '';
    modal.querySelector('.modal-divider').style.display = '';
    const panel = document.getElementById('profileSetupPanel');
    if (panel) panel.style.display = 'none';
    // 닉네임 체크 상태 리셋
    nicknameChecked = false;
    nicknameAvailable = false;
    const photoInput = document.getElementById('profilePhotoInput');
    if (photoInput) photoInput.value = '';
}

function initProfileSetupPanel() {
    const panel = document.getElementById('profileSetupPanel');
    if (!panel) return;

    const nicknameInput = document.getElementById('profileNickname');
    const checkBtn = document.getElementById('checkNicknameBtn');
    const statusEl = document.getElementById('nicknameStatus');
    const photoInput = document.getElementById('profilePhotoInput');
    const photoPreview = document.getElementById('profilePhotoPreview');
    const saveBtn = document.getElementById('profileSaveBtn');

    // 닉네임 입력 변경 → 중복 체크 초기화
    nicknameInput.addEventListener('input', () => {
        nicknameChecked = false;
        nicknameAvailable = false;
        statusEl.style.display = 'none';
        saveBtn.disabled = true;
    });

    // 프로필 사진 미리보기
    photoInput.addEventListener('change', () => {
        const file = photoInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            photoPreview.style.backgroundImage = `url(${e.target.result})`;
            photoPreview.style.backgroundSize = 'cover';
            photoPreview.style.backgroundPosition = 'center';
            photoPreview.innerHTML = '';
        };
        reader.readAsDataURL(file);
    });

    // 닉네임 중복 확인 버튼
    checkBtn.addEventListener('click', async () => {
        const nickname = nicknameInput.value.trim();
        if (!isValidNickname(nickname)) {
            statusEl.textContent = '닉네임은 2~20자의 한글·영문·숫자·_만 사용할 수 있습니다.';
            statusEl.className = 'nickname-status error';
            statusEl.style.display = 'block';
            return;
        }

        checkBtn.disabled = true;
        checkBtn.textContent = '확인 중...';
        try {
            const available = await checkNicknameAvailable(nickname);
            nicknameChecked = true;
            nicknameAvailable = available;
            if (available) {
                statusEl.textContent = '사용 가능한 닉네임입니다.';
                statusEl.className = 'nickname-status success';
                saveBtn.disabled = false;
            } else {
                statusEl.textContent = '이미 사용 중인 닉네임입니다.';
                statusEl.className = 'nickname-status error';
                saveBtn.disabled = true;
            }
            statusEl.style.display = 'block';
        } catch {
            statusEl.textContent = '중복 확인 중 오류가 발생했습니다.';
            statusEl.className = 'nickname-status error';
            statusEl.style.display = 'block';
        } finally {
            checkBtn.disabled = false;
            checkBtn.textContent = '중복 확인';
        }
    });

    // 프로필 설정 폼 제출
    document.getElementById('profileSetupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!nicknameChecked || !nicknameAvailable) {
            showModalError('닉네임 중복 확인을 완료해주세요.');
            return;
        }
        const nickname = nicknameInput.value.trim();
        const realName = document.getElementById('profileRealName').value.trim();
        const photoFile = photoInput.files[0] || null;
        const user = pendingProfileUser;

        saveBtn.disabled = true;
        saveBtn.textContent = '저장 중...';
        try {
            await saveUserProfile(user, nickname, realName, photoFile);
            // 헤더 닉네임 갱신
            const userEmailEl = document.getElementById('authUserEmail');
            if (userEmailEl) userEmailEl.textContent = nickname;
            document.getElementById('authModal').style.display = 'none';
            hideProfileSetupUI();
            clearModalError();
        } catch (err) {
            showModalError('프로필 저장 중 오류가 발생했습니다: ' + err.message);
            saveBtn.disabled = false;
            saveBtn.textContent = '완료';
        }
    });
}

// onAuthStateChanged 리스너를 헤더 UI 업데이트에 연결
export function initAuth() {
    const signInBtn = document.getElementById('authSignInBtn');
    const userArea = document.getElementById('authUserArea');
    const userEmail = document.getElementById('authUserEmail');
    const signOutBtn = document.getElementById('authSignOutBtn');
    const modal = document.getElementById('authModal');

    if (!signInBtn) return; // auth-area가 없는 페이지에서는 중단

    // 로그인 상태 변경 감지
    onAuthStateChanged(auth, (user) => {
        if (user) {
            signInBtn.style.display = 'none';
            userArea.style.display = 'flex';
            userEmail.textContent = user.displayName || user.email || '';
        } else {
            signInBtn.style.display = 'inline-block';
            userArea.style.display = 'none';
        }
    });

    // 로그인 버튼 → 모달 오픈
    signInBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
        clearModalError();
    });

    // 로그아웃 버튼
    signOutBtn.addEventListener('click', () => {
        signOut(auth);
    });

    // 모달 외부 클릭 → 닫지 않음 (X 버튼으로만 닫기)

    // 탭 전환
    document.getElementById('tabSignIn').addEventListener('click', () => switchTab('signin'));
    document.getElementById('tabSignUp').addEventListener('click', () => switchTab('signup'));

    // 모달 닫기 버튼
    document.getElementById('modalCloseBtn').addEventListener('click', () => {
        modal.style.display = 'none';
        hideProfileSetupUI();
        clearModalError();
        switchTab('signin');
    });

    // Google 로그인
    document.getElementById('googleSignInBtn').addEventListener('click', async () => {
        clearModalError();
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            // 프로필 완성 여부 확인
            const complete = await isProfileComplete(user.uid);
            if (!complete) {
                showProfileSetup(user);
            } else {
                modal.style.display = 'none';
            }
        } catch (e) {
            showModalError(e.message);
        }
    });

    // 이메일 로그인 폼
    document.getElementById('emailSignInForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        clearModalError();
        const email = document.getElementById('signinEmail').value;
        const password = document.getElementById('signinPassword').value;
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            // 프로필 미완성 사용자는 설정 패널로
            const complete = await isProfileComplete(result.user.uid);
            if (!complete) {
                showProfileSetup(result.user);
            } else {
                modal.style.display = 'none';
            }
        } catch (err) {
            showModalError(getAuthErrorMessage(err.code));
        }
    });

    // 이메일 회원가입 폼
    document.getElementById('emailSignUpForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        clearModalError();
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirm = document.getElementById('signupConfirm').value;
        if (password !== confirm) {
            showModalError('비밀번호가 일치하지 않습니다.');
            return;
        }
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            // 계정 생성 후 프로필 설정 패널으로 전환
            showProfileSetup(result.user);
        } catch (err) {
            showModalError(getAuthErrorMessage(err.code));
        }
    });

    // 프로필 설정 패널 초기화
    initProfileSetupPanel();
}

function switchTab(tab) {
    const isSignIn = tab === 'signin';
    document.getElementById('tabSignIn').classList.toggle('active', isSignIn);
    document.getElementById('tabSignUp').classList.toggle('active', !isSignIn);
    document.getElementById('signinPanel').style.display = isSignIn ? 'block' : 'none';
    document.getElementById('signupPanel').style.display = isSignIn ? 'none' : 'block';
    clearModalError();
}

function showModalError(msg) {
    const el = document.getElementById('authModalError');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function clearModalError() {
    const el = document.getElementById('authModalError');
    if (el) { el.textContent = ''; el.style.display = 'none'; }
}

function getAuthErrorMessage(code) {
    const messages = {
        'auth/user-not-found': '등록되지 않은 이메일입니다.',
        'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
        'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
        'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
        'auth/invalid-email': '유효하지 않은 이메일 형식입니다.',
        'auth/too-many-requests': '잠시 후 다시 시도해주세요.',
        'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
    };
    return messages[code] || '로그인 중 오류가 발생했습니다.';
}

// 캔버스를 Blob으로 변환 (Promise)
function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// 도안을 Firebase Storage + Firestore에 저장
export async function savePatternToCloud(patternCanvas, originalCanvas, legendHTML, infoText, settings) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    const patternId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const basePath = `users/${user.uid}/patterns/${patternId}`;

    // 1. 도안 이미지 업로드 (PNG)
    const patternBlob = await canvasToBlob(patternCanvas, 'image/png');
    const patternRef = ref(storage, `${basePath}/pattern.png`);
    await uploadBytes(patternRef, patternBlob);
    const patternImageURL = await getDownloadURL(patternRef);

    // 2. 원본 이미지 업로드 (JPEG)
    const originalBlob = await canvasToBlob(originalCanvas, 'image/jpeg', 0.85);
    const originalRef = ref(storage, `${basePath}/original.jpg`);
    await uploadBytes(originalRef, originalBlob);
    const originalImageURL = await getDownloadURL(originalRef);

    // 3. 숫자 파싱 (infoText: "120 Stitches x 150 Rows (50cm x 62.5cm)")
    const nums = (infoText || '').match(/\d+(\.\d+)?/g) || [];
    const stitches = parseInt(nums[0]) || 0;
    const rows = parseInt(nums[1]) || 0;
    const widthCm = parseFloat(nums[2]) || 0;

    // 4. Firestore에 메타데이터 저장
    const patternsRef = collection(db, `users/${user.uid}/patterns`);
    await addDoc(patternsRef, {
        name: settings.name || `도안 ${new Date().toLocaleDateString('ko-KR')}`,
        patternImageURL,
        originalImageURL,
        legendHTML,
        stitches,
        rows,
        widthCm,
        yarnType: settings.yarnType || null,
        yarnMm: settings.yarnMm ? parseFloat(settings.yarnMm) : null,
        colorCount: settings.colorCount || 0,
        showGrid: settings.showGrid || false,
        techniqueRatio: settings.techniqueRatio || 1,
        createdAt: serverTimestamp()
    });
}
