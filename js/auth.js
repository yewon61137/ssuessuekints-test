// auth.js — Firebase 초기화 + 인증 + 도안 저장 + 프로필 관리
// Firebase 10 CDN ES 모듈 사용 (빌드 불필요)

import { auth } from './firebase-auth.js';
import { db } from './firebase-db.js';
import {
    onAuthStateChanged,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signInWithCustomToken,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    sendEmailVerification,
    deleteUser,
    setPersistence,
    browserSessionPersistence,
    browserLocalPersistence
} from './firebase-auth.js';
import {
    collection,
    addDoc,
    serverTimestamp,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    updateDoc
} from './firebase-db.js';

export { auth, db };
// Storage is imported dynamically in functions that need it

// 모바일/태블릿/Safari 감지 헬퍼
// Safari는 signInWithPopup 전 async 작업(setPersistence) 이후 팝업을
// user gesture 없음으로 판단해 차단하므로 리다이렉트 방식 사용
function isMobileDevice() {
    const ua = navigator.userAgent;
    const isMobile = /Mobi|Android|iPhone|iPad|iPod|Opera Mini/i.test(ua)
        || window.innerWidth <= 768;
    // Safari 감지: Chrome/Edge/Android의 'chrome' 키워드가 없고 'safari'가 있는 경우
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
    return isMobile || isSafari;
}

export async function applyAuthPersistence() {
    if (!auth) return;
    const rm = document.getElementById('rememberMeCheck');
    const type = (rm && rm.checked) ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, type);
}

export function getCurrentUser() {
    return auth ? auth.currentUser : null;
}

/**
 * 프로젝트 보안 규칙 준수를 위한 파일 검증 함수
 * - 크기 제한: 10MB
 * - 형식: MIME 타입 및 확장자 체크
 */
export function validateFile(file, options = {}) {
    const { 
        maxSizeMB = 10, 
        allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
        allowedMimetypes = ['image/', 'application/pdf']
    } = options;

    if (!file) return { valid: false, error: '파일이 선택되지 않았습니다.' };
    
    // 1. 크기 검증 (10MB)
    if (file.size > maxSizeMB * 1024 * 1024) {
        return { valid: false, error: `파일 크기는 ${maxSizeMB}MB를 초과할 수 없습니다.` };
    }
    
    // 2. MIME 타입 검증
    const mimeValid = allowedMimetypes.some(m => file.type.startsWith(m) || file.type === m);
    if (!mimeValid) {
        return { valid: false, error: '지원하지 않는 파일 형식입니다.' };
    }
    
    // 3. 확장자 검증
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
        return { valid: false, error: '지원하지 않는 파일 확장자입니다.' };
    }
    
    return { valid: true };
}

// 사용자 프로필 조회
export async function getUserProfile(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data();
}

// 사용자 프로필 수정 (마이페이지 탭에서 호출)
export async function updateUserProfile(uid, { nickname, currentNickname, realName, bio, photoFile }) {
    let profilePhotoURL = null;

    // 기존 프로필 사진 URL 유지
    const existing = await getUserProfile(uid);
    profilePhotoURL = existing?.profilePhotoURL || null;

    // 새 사진 업로드
    if (photoFile) {
        const v = validateFile(photoFile);
        if (!v.valid) throw new Error(v.error);

        const { storage, ref, uploadBytes, getDownloadURL } = await import('./firebase-storage.js');
        const photoRef = ref(storage, `users/${uid}/profile/avatar.jpg`);
        await uploadBytes(photoRef, photoFile);
        profilePhotoURL = await getDownloadURL(photoRef);
    }

    // 닉네임이 바뀐 경우 usernames 컬렉션 갱신
    if (nickname !== currentNickname) {
        // 새 닉네임 예약
        await setDoc(doc(db, 'usernames', nickname), { uid });
        // 기존 닉네임 해제
        if (currentNickname) {
            await deleteDoc(doc(db, 'usernames', currentNickname));
        }
    }

    // Firestore users/{uid} 갱신
    await updateDoc(doc(db, 'users', uid), {
        nickname,
        displayName: realName || null,
        bio: bio || '',
        profilePhotoURL,
        profileCompleted: true
    });

    // Firebase Auth displayName 업데이트
    const user = auth.currentUser;
    if (user) {
        await updateProfile(user, { displayName: nickname, photoURL: profilePhotoURL || user.photoURL });
    }

    return profilePhotoURL;
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
        const v = validateFile(photoFile);
        if (!v.valid) throw new Error(v.error);

        const { storage, ref, uploadBytes, getDownloadURL } = await import('./firebase-storage.js');
        const photoRef = ref(storage, `users/${user.uid}/profile/avatar.jpg`);
        await uploadBytes(photoRef, photoFile);
        profilePhotoURL = await getDownloadURL(photoRef);
    }

    // 2. Firestore users/{uid} 저장
    // 커스텀 토큰(네이버) 로그인 시 user.email이 null이므로 sessionStorage 백업 사용
    const naverEmail = sessionStorage.getItem('naver_pending_email');
    if (naverEmail) sessionStorage.removeItem('naver_pending_email');
    await setDoc(doc(db, 'users', user.uid), {
        nickname,
        displayName: realName || null,
        profilePhotoURL,
        email: user.email || naverEmail || null,
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
let verificationTimer = null;
let verificationFocusHandler = null;

// 로그인 완료 후 실행할 콜백 (모달 외부에서 설정)
let onAuthCompleteCallback = null;

export function setOnAuthComplete(fn) {
    onAuthCompleteCallback = fn;
}

function callOnAuthComplete() {
    if (onAuthCompleteCallback) {
        const fn = onAuthCompleteCallback;
        onAuthCompleteCallback = null;
        setTimeout(fn, 150);
    }
}


function showProfileSetup(user) {
    pendingProfileUser = user;
    nicknameChecked = false;
    nicknameAvailable = false;
    stopVerificationCheck();

    const modal = document.getElementById('authModal');
    // 탭·소셜 버튼·구분선 숨기기
    modal.querySelector('.modal-tabs').style.display = 'none';
    modal.querySelector('.google-btn').style.display = 'none';
    modal.querySelector('.naver-btn')?.style && (modal.querySelector('.naver-btn').style.display = 'none');
    modal.querySelector('.modal-divider').style.display = 'none';
    document.getElementById('signinPanel').style.display = 'none';
    document.getElementById('signupPanel').style.display = 'none';
    document.getElementById('verificationSentPanel').style.display = 'none';

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

function showVerificationSentUI(email) {
    const modal = document.getElementById('authModal');
    modal.querySelector('.modal-tabs').style.display = 'none';
    modal.querySelector('.google-btn').style.display = 'none';
    modal.querySelector('.modal-divider').style.display = 'none';
    document.getElementById('signinPanel').style.display = 'none';
    document.getElementById('signupPanel').style.display = 'none';
    document.getElementById('profileSetupPanel').style.display = 'none';

    const panel = document.getElementById('verificationSentPanel');
    panel.style.display = 'block';
    document.getElementById('sentEmailAddress').textContent = email;
    modal.style.display = 'flex';
    
    // 자동 인증 체크 시작
    startVerificationCheck();
}

function startVerificationCheck() {
    stopVerificationCheck();
    const check = async () => {
        const user = auth.currentUser;
        if (!user) return;
        await user.reload();
        if (auth.currentUser.emailVerified) {
            stopVerificationCheck();
            const complete = await isProfileComplete(auth.currentUser.uid);
            if (!complete) {
                showProfileSetup(auth.currentUser);
            } else {
                document.getElementById('authModal').style.display = 'none';
                hideProfileSetupUI();
                callOnAuthComplete();
            }
        }
    };
    // 3초마다 체크 + 윈도우 포커스 시 체크
    verificationTimer = setInterval(check, 3000);
    verificationFocusHandler = check;
    window.addEventListener('focus', check);
}

function stopVerificationCheck() {
    if (verificationTimer) clearInterval(verificationTimer);
    verificationTimer = null;
    if (verificationFocusHandler) {
        window.removeEventListener('focus', verificationFocusHandler);
        verificationFocusHandler = null;
    }
}

function hideProfileSetupUI() {
    pendingProfileUser = null;
    stopVerificationCheck();
    const modal = document.getElementById('authModal');
    modal.querySelector('.modal-tabs').style.display = '';
    modal.querySelector('.google-btn').style.display = '';
    modal.querySelector('.naver-btn')?.style && (modal.querySelector('.naver-btn').style.display = '');
    modal.querySelector('.modal-divider').style.display = '';
    const setupPanel = document.getElementById('profileSetupPanel');
    if (setupPanel) setupPanel.style.display = 'none';
    const sentPanel = document.getElementById('verificationSentPanel');
    if (sentPanel) sentPanel.style.display = 'none';
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
            callOnAuthComplete();
        } catch (err) {
            showModalError('프로필 저장 중 오류가 발생했습니다: ' + err.message);
            saveBtn.disabled = false;
            saveBtn.textContent = '완료';
        }
    });
}

// authModal이 없는 페이지(magazine, toolkit 등)에서도 로그인 모달을 동작시키기 위해 동적 주입
function ensureAuthModal() {
    if (document.getElementById('authModal')) return;
    const html = `<div id="authModal" class="modal-overlay" style="display:none;">
    <div class="modal-box">
      <button class="modal-close" id="modalCloseBtn" aria-label="닫기">&#x2715;</button>
      <div class="modal-tabs">
        <button class="modal-tab active" id="tabSignIn" data-i18n="tab_signin">로그인</button>
        <button class="modal-tab" id="tabSignUp" data-i18n="tab_signup">회원가입</button>
      </div>
      <div style="text-align:right;padding:0 20px 10px;">
        <label style="font-size:13px;color:var(--text-secondary);cursor:pointer;">
          <input type="checkbox" id="rememberMeCheck" style="margin-right:4px;"> <span class="mobile-i18n" data-ko="자동 로그인" data-en="Remember Me" data-ja="自動ログイン">자동 로그인</span>
        </label>
      </div>
      <div class="social-login-group">
        <button class="social-btn google-btn" id="googleSignInBtn">
          <svg width="18" height="18" viewBox="0 0 48 48" style="vertical-align:middle;margin-right:8px;"><path fill="#4285F4" d="M46.145 24.5c0-1.567-.14-3.077-.402-4.52H24v8.554h12.433c-.536 2.738-2.17 5.058-4.627 6.613v5.496h7.49C43.306 36.625 46.145 30.985 46.145 24.5z"/><path fill="#34A853" d="M24 47c6.24 0 11.47-2.07 15.293-5.617l-7.49-5.497c-2.07 1.387-4.72 2.206-7.803 2.206-6.002 0-11.083-4.054-12.898-9.502H3.4v5.674C7.205 42.804 15.035 47 24 47z"/><path fill="#FBBC05" d="M11.102 28.59A13.97 13.97 0 0 1 10.5 24c0-1.594.273-3.14.602-4.59v-5.673H3.4A22.965 22.965 0 0 0 1 24c0 3.723.893 7.24 2.4 10.263l7.702-5.673z"/><path fill="#EA4335" d="M24 10.158c3.383 0 6.42 1.163 8.808 3.447l6.605-6.606C35.467 3.296 30.24 1 24 1 15.035 1 7.205 5.196 3.4 13.737l7.702 5.673C12.917 14.212 17.998 10.158 24 10.158z"/></svg>
          <span data-i18n="btn_google">Google로 계속하기</span>
        </button>
        <button class="social-btn naver-btn" id="naverSignInBtn">
          <span class="naver-icon">N</span>
          <span data-i18n="btn_naver">네이버로 계속하기</span>
        </button>
      </div>
      <div class="modal-divider"><span data-i18n="or_divider">또는</span></div>
      <div id="signinPanel">
        <form id="emailSignInForm" class="auth-form">
          <input type="email" id="signinEmail" placeholder="이메일" autocomplete="email" required>
          <input type="password" id="signinPassword" placeholder="비밀번호" autocomplete="current-password" required>
          <button type="submit" class="primary-btn auth-submit-btn" data-i18n="btn_signin">로그인</button>
        </form>
      </div>
      <div id="signupPanel" style="display:none;">
        <form id="emailSignUpForm" class="auth-form">
          <input type="email" id="signupEmail" placeholder="이메일" autocomplete="email" required>
          <input type="password" id="signupPassword" placeholder="비밀번호 (6자 이상)" autocomplete="new-password" required>
          <input type="password" id="signupConfirm" placeholder="비밀번호 확인" autocomplete="new-password" required>
          <button type="submit" class="primary-btn auth-submit-btn" data-i18n="btn_signup">회원가입</button>
        </form>
      </div>
      <div id="profileSetupPanel" style="display:none;">
        <div class="profile-setup-header">
          <p class="profile-setup-title">프로필 설정</p>
          <p class="profile-setup-desc">커뮤니티에서 사용할 닉네임을 설정해주세요.</p>
        </div>
        <form id="profileSetupForm" class="auth-form">
          <div class="profile-photo-upload-area">
            <div class="profile-photo-preview" id="profilePhotoPreview">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            </div>
            <label for="profilePhotoInput" class="secondary-btn small-btn">사진 선택 (선택)</label>
            <input type="file" id="profilePhotoInput" accept="image/*" style="display:none;">
          </div>
          <div class="nickname-input-group">
            <div class="nickname-input-row">
              <input type="text" id="profileNickname" placeholder="닉네임 (2~20자, 필수)" maxlength="20" required autocomplete="off">
              <button type="button" class="secondary-btn small-btn" id="checkNicknameBtn">중복 확인</button>
            </div>
            <div id="nicknameStatus" class="nickname-status" style="display:none;"></div>
          </div>
          <input type="text" id="profileRealName" placeholder="실명 (선택)" maxlength="50" autocomplete="name">
          <button type="submit" class="primary-btn auth-submit-btn" id="profileSaveBtn" disabled>완료</button>
        </form>
      </div>
      <div id="verificationSentPanel" style="display:none;text-align:center;padding:1rem 0;">
        <div style="font-size:3rem;margin-bottom:1rem;">✉️</div>
        <h3 style="margin-bottom:1rem;font-weight:800;">이메일 인증이 필요합니다</h3>
        <p style="font-size:0.9rem;line-height:1.6;color:var(--secondary-color);margin-bottom:1.5rem;">
          <span id="sentEmailAddress" style="font-weight:700;color:var(--primary-color);"></span>(으)로 인증 메일을 보냈습니다.<br>
          메일함의 링크를 클릭하면 이 화면이 자동으로 전환됩니다.
        </p>
        <p style="font-size:0.8rem;color:#cc6600;margin-bottom:1.5rem;background:#fff9f0;padding:0.5rem 0.75rem;border:1px solid #ffe0b3;text-align:left;line-height:1.7;">
          ⚠️ 메일이 오지 않았다면 <b>스팸함</b>을 꼭 확인해 주세요!<br>
          📌 <b>네이버·카카오·다음 등 국내 메일</b>은 발신 서버 차단으로 수신이 안 될 수 있습니다.<br>
          <b>Gmail</b> 주소로 가입하시면 안정적으로 받으실 수 있습니다.
        </p>
        <div style="display:flex;flex-direction:column;gap:0.75rem;">
          <button type="button" class="primary-btn auth-submit-btn" id="verifyDoneBtn">인증 완료 확인</button>
          <button type="button" class="secondary-btn small-btn" id="resendEmailBtn" style="width:100%;max-width:none;">메일 다시 보내기</button>
        </div>
      </div>
      <div id="authModalError" class="auth-error" style="display:none;"></div>
    </div>
  </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

// Google 리다이렉트 로그인 복귀 처리 — 이벤트 리스너 등록과 병렬 실행
async function handleGoogleRedirectResult() {
    try {
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult && redirectResult.user) {
            const user = redirectResult.user;
            // 모달이 아직 DOM에 없을 수 있으므로 먼저 주입 보장
            ensureAuthModal();
            const modal = document.getElementById('authModal');
            const complete = await isProfileComplete(user.uid);
            if (!complete) {
                showProfileSetup(user);
            } else {
                if (modal) modal.style.display = 'none';
                callOnAuthComplete();
            }
        }
    } catch (e) {
        // auth/no-current-user 는 정상 케이스 (리다이렉트 결과 없음)
        if (e.code && e.code !== 'auth/no-current-user') {
            console.error('getRedirectResult error:', e);
        }
    }
}

// onAuthStateChanged 리스너를 헤더 UI 업데이트에 연결
export function initAuth() {
    if (!auth) {
        console.warn("Auth system inactive (Firebase config missing).");
        return;
    }
    const signInBtn = document.getElementById('authSignInBtn');
    if (!signInBtn) return; // auth-area가 없는 페이지에서는 중단

    // authModal이 없는 페이지(magazine, toolkit 등)에 모달을 동적으로 주입
    ensureAuthModal();

    const userArea = document.getElementById('authUserArea');
    const userEmail = document.getElementById('authUserEmail');
    const signOutBtn = document.getElementById('authSignOutBtn');
    const modal = document.getElementById('authModal');

    // ── Google 리다이렉트 복귀 결과를 비동기로 병렬 처리 (이벤트 리스너 등록을 막지 않음) ──
    handleGoogleRedirectResult();

    // 로그인 상태 변경 감지
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // 즉시 로그인 상태 표시 (Firestore 응답 기다리지 않음)
            signInBtn.style.display = 'none';
            userArea.style.display = 'flex';
            userEmail.textContent = user.displayName || user.email || '';

            // 프로필 미완성 사용자는 프로필 설정 패널 표시 (이미 진행 중이 아닐 때)
            if (!pendingProfileUser) {
                // 네이버 로그인 콜백에서 설정한 플래그 확인 (Firestore 의존 없이 즉시 처리)
                if (sessionStorage.getItem('naver_setup_needed') === '1') {
                    sessionStorage.removeItem('naver_setup_needed');
                    showProfileSetup(user);
                    return;
                }
                try {
                    const snap = await getDoc(doc(db, 'users', user.uid));
                    if (snap.exists()) {
                        const data = snap.data();
                        if (!data.profileCompleted) showProfileSetup(user);
                        // Firestore 닉네임으로 업데이트
                        if (data.nickname) userEmail.textContent = data.nickname;
                    } else {
                        showProfileSetup(user);
                    }
                } catch (e) {
                    console.error('Profile check failed:', e);
                    // Firestore 오류 시에도 프로필 설정 모달 표시
                    showProfileSetup(user);
                }
            }
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

    // 로그아웃 버튼 → 로그아웃 후 홈으로 이동
    // signOut 완료를 기다리지 않고 즉시 이동 (mypage 등의 onAuthStateChanged가 먼저 발동해
    // openAuthModal()을 열어버리는 경쟁 조건 방지)
    signOutBtn.addEventListener('click', () => {
        stopVerificationCheck();
        window.__signOutInProgress = true;
        signOut(auth).catch(e => console.error('signOut error:', e));
        window.location.replace('/');
    });

    // 모달 외부 클릭 → 닫지 않음 (X 버튼으로만 닫기)

    // 탭 전환
    document.getElementById('tabSignIn').addEventListener('click', () => switchTab('signin'));
    document.getElementById('tabSignUp').addEventListener('click', () => switchTab('signup'));

    // 모달 닫기 버튼 (X) — 사용자가 직접 닫은 경우 콜백 취소
    document.getElementById('modalCloseBtn').addEventListener('click', () => {
        modal.style.display = 'none';
        hideProfileSetupUI();
        clearModalError();
        switchTab('signin');
        onAuthCompleteCallback = null;
    });

    // Google 로그인 (모바일: 리다이렉트 / PC: 팝업 + 팝업 차단 시 리다이렉트 폴백)
    document.getElementById('googleSignInBtn').addEventListener('click', async () => {
        clearModalError();
        const provider = new GoogleAuthProvider();

        const doRedirect = async () => {
            try {
                // 리다이렉트 flow는 반드시 localStorage 기반 persistence 사용
                // iOS Safari에서 cross-origin 이동 시 sessionStorage가 초기화되어
                // getRedirectResult가 null을 반환하는 문제 방지
                await setPersistence(auth, browserLocalPersistence);
                localStorage.setItem('google_return_path', window.location.pathname + window.location.search);
                await signInWithRedirect(auth, provider);
            } catch (e2) {
                showModalError(e2.message);
            }
        };

        if (isMobileDevice()) {
            // 모바일/태블릿: 팝업 대신 현재 탭에서 리다이렉트
            await doRedirect();
            return;
        }

        // PC: 팝업 우선 시도
        try {
            await applyAuthPersistence();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const complete = await isProfileComplete(user.uid);
            if (!complete) {
                showProfileSetup(user);
            } else {
                modal.style.display = 'none';
                callOnAuthComplete();
            }
        } catch (e) {
            if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user') {
                // 팝업 차단 또는 사용자 닫기 → 리다이렉트로 폴백
                await doRedirect();
            } else {
                showModalError(e.message);
            }
        }
    });

    // 네이버 로그인: 팝업에서 받은 토큰으로 메인 창에서 직접 Firebase 로그인 처리
    async function handleNaverResult(data) {
        if (!data.success) {
            showModalError(data.error || '네이버 로그인에 실패했습니다.');
            return;
        }
        try {
            if (data.naverEmail) sessionStorage.setItem('naver_pending_email', data.naverEmail);
            await applyAuthPersistence();
            const result = await signInWithCustomToken(auth, data.firebaseToken);
            const user = result.user;
            // Firebase Auth 프로필 업데이트
            if (data.naverUser) {
                const { nickname, profilePhotoURL } = data.naverUser;
                if (nickname || profilePhotoURL) {
                    await updateProfile(user, {
                        displayName: nickname || user.displayName || '',
                        photoURL: profilePhotoURL || user.photoURL || ''
                    });
                }
            }
            // 프로필 완성 여부 확인 후 처리
            const complete = await isProfileComplete(user.uid);
            if (!complete) {
                showProfileSetup(user);
            } else {
                modal.style.display = 'none';
                callOnAuthComplete();
            }
        } catch (e) {
            showModalError('로그인 오류: ' + e.message);
        }
    }

    // 리다이렉트 폴백: 팝업 차단 후 페이지 리로드로 돌아온 경우
    const storedNaverResult = localStorage.getItem('naver_auth_result');
    if (storedNaverResult) {
        localStorage.removeItem('naver_auth_result');
        try {
            const parsed = JSON.parse(storedNaverResult);
            if (parsed.type === 'naver_auth_complete') {
                modal.style.display = 'flex';
                handleNaverResult(parsed);
            }
        } catch (e) {}
    }

    // 네이버 로그인 버튼 (PC: 팝업 / 모바일: 리다이렉트)
    const naverBtn = document.getElementById('naverSignInBtn');
    if (naverBtn) {
        naverBtn.addEventListener('click', () => {
            const clientId = 'Fe19uUByKG1KyTLtsg67';
            const redirectUri = encodeURIComponent(window.location.origin + '/auth-callback.html');
            const state = Math.random().toString(36).substring(2, 15);
            localStorage.setItem('naver_oauth_state', state);
            const rm = document.getElementById('rememberMeCheck');
            localStorage.setItem('naver_remember_me', (rm && rm.checked) ? '1' : '0');
            const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;

            // 모바일 감지: window.open() 팝업은 네이버가 인앱 브라우저로 감지해 차단(error 207)
            const isMobile = /Mobi|Android|iPhone|iPad|iPod|Opera Mini/i.test(navigator.userAgent)
                          || window.innerWidth <= 768;

            if (isMobile) {
                // 모바일: 현재 페이지 경로 저장 후 현재 탭에서 직접 이동
                localStorage.setItem('naver_return_path', window.location.pathname + window.location.search);
                localStorage.setItem('naver_redirect_fallback', '1');
                window.location.href = naverAuthUrl;
                return;
            }

            // PC: 팝업 방식 유지
            const pw = 500, ph = 700;
            const pl = Math.round(screen.width / 2 - pw / 2);
            const pt = Math.round(screen.height / 2 - ph / 2);
            const popup = window.open(naverAuthUrl, 'naver_auth', `width=${pw},height=${ph},left=${pl},top=${pt}`);

            if (!popup || popup.closed) {
                // 팝업 차단된 경우에도 원래 경로 저장 후 리다이렉트
                localStorage.setItem('naver_return_path', window.location.pathname + window.location.search);
                localStorage.setItem('naver_redirect_fallback', '1');
                window.location.href = naverAuthUrl;
                return;
            }

            // postMessage 수신 (window.opener가 살아있는 경우)
            function onNaverAuthMsg(e) {
                if (window.location.protocol !== 'file:' && e.origin !== window.location.origin) return;
                if (!e.data || e.data.type !== 'naver_auth_complete') return;
                window.removeEventListener('message', onNaverAuthMsg);
                window.removeEventListener('storage', onNaverStorage);
                handleNaverResult(e.data);
            }

            // storage 이벤트 폴백 (window.opener가 null인 브라우저 대비)
            function onNaverStorage(e) {
                if (e.key !== 'naver_auth_result') return;
                window.removeEventListener('message', onNaverAuthMsg);
                window.removeEventListener('storage', onNaverStorage);
                try {
                    const result = JSON.parse(e.newValue);
                    localStorage.removeItem('naver_auth_result');
                    handleNaverResult(result);
                } catch {}
            }

            window.addEventListener('message', onNaverAuthMsg);
            window.addEventListener('storage', onNaverStorage);
        });
    }

    // 이메일 로그인 폼
    document.getElementById('emailSignInForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        clearModalError();
        const email = document.getElementById('signinEmail').value;
        const password = document.getElementById('signinPassword').value;
        try {
            await applyAuthPersistence();
            const result = await signInWithEmailAndPassword(auth, email, password);
            const user = result.user;

            if (!user.emailVerified) {
                await sendEmailVerification(user);
                showVerificationSentUI(user.email);
                return;
            }

            // 프로필 미완성 사용자는 설정 패널로
            const complete = await isProfileComplete(user.uid);
            if (!complete) {
                showProfileSetup(user);
            } else {
                modal.style.display = 'none';
                callOnAuthComplete();
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
            await applyAuthPersistence();
            const result = await createUserWithEmailAndPassword(auth, email, password);
            const user = result.user;
            
            // 이메일 인증 메일 발송
            await sendEmailVerification(user);
            showVerificationSentUI(user.email);
            
        } catch (err) {
            showModalError(getAuthErrorMessage(err.code));
        }
    });

    // 프로필 설정 패널 초기화
    initProfileSetupPanel();
    
    // 이메일 인증 확인 패널의 버튼들
    const verifyDoneBtn = document.getElementById('verifyDoneBtn');
    if (verifyDoneBtn) {
        verifyDoneBtn.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (user) {
                await user.reload();
                if (user.emailVerified) {
                    const complete = await isProfileComplete(user.uid);
                    if (!complete) showProfileSetup(user);
                    else { modal.style.display = 'none'; hideProfileSetupUI(); callOnAuthComplete(); }
                } else {
                    showModalError('아직 인증이 완료되지 않았습니다. 메일함을 확인해주세요.');
                }
            }
        });
    }
    
    const resendEmailBtn = document.getElementById('resendEmailBtn');
    if (resendEmailBtn) {
        resendEmailBtn.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (user) {
                try {
                    await sendEmailVerification(user);
                    alert('인증 메일을 다시 보냈습니다.');
                } catch (e) {
                    showModalError('메일 발송 실패: ' + e.message);
                }
            }
        });
    }

}

function switchTab(tab) {
    stopVerificationCheck();
    const isSignIn = tab === 'signin';
    const signInTab = document.getElementById('tabSignIn');
    const signUpTab = document.getElementById('tabSignUp');
    const signInPanel = document.getElementById('signinPanel');
    const signUpPanel = document.getElementById('signupPanel');
    const setupPanel = document.getElementById('profileSetupPanel');
    const sentPanel = document.getElementById('verificationSentPanel');

    if (signInTab) signInTab.classList.toggle('active', isSignIn);
    if (signUpTab) signUpTab.classList.toggle('active', !isSignIn);
    if (signInPanel) signInPanel.style.display = isSignIn ? 'block' : 'none';
    if (signUpPanel) signUpPanel.style.display = isSignIn ? 'none' : 'block';
    if (setupPanel) setupPanel.style.display = 'none';
    if (sentPanel) sentPanel.style.display = 'none';
    
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.querySelector('.modal-tabs').style.display = '';
        modal.querySelector('.google-btn').style.display = '';
        modal.querySelector('.naver-btn')?.style && (modal.querySelector('.naver-btn').style.display = '');
        modal.querySelector('.modal-divider').style.display = '';
    }
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

// 회원 탈퇴: Firestore + Storage + Firebase Auth 계정 삭제
export async function deleteUserAccount(user) {
    const uid = user.uid;

    // 1. 닉네임 조회 (usernames 해제용)
    const profile = await getUserProfile(uid);
    const nickname = profile?.nickname;

    // 2. Firestore 서브컬렉션 삭제 (patterns, likes, scraps, rowCounters, palettes)
    for (const sub of ['patterns', 'likes', 'scraps', 'rowCounters', 'palettes']) {
        const snap = await getDocs(collection(db, 'users', uid, sub));
        await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    }

    // 3. Storage 파일 삭제 (users/{uid}/ 하위 전체)
    try {
        const { storage, ref, listAll, deleteObject } = await import('./firebase-storage.js');
        const deleteDir = async (dirRef) => {
            const result = await listAll(dirRef);
            await Promise.all(result.items.map(item => deleteObject(item)));
            await Promise.all(result.prefixes.map(prefix => deleteDir(prefix)));
        };
        await deleteDir(ref(storage, `users/${uid}`));
    } catch (e) {
        console.warn('Storage 삭제 일부 실패 (계속 진행):', e);
    }

    // 4. Firestore users/{uid} 문서 삭제
    await deleteDoc(doc(db, 'users', uid));

    // 5. 닉네임 예약 해제
    if (nickname) await deleteDoc(doc(db, 'usernames', nickname));

    // 6. Firebase Auth 계정 삭제
    await deleteUser(user);
}

export function openAuthModal() {
    if (window.__signOutInProgress) return;
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'flex';
        clearModalError();
    }
}

/**
 * 로그인 필요 토스트 메시지 (전 페이지 공용)
 * 3개 국어 자동 감지, 3초 후 자동 사라짐, 중복 방지
 */
export function showLoginRequiredToast() {
    const lang = localStorage.getItem('ssuessue_lang') || 'ko';
    const msg = {
        ko: '로그인 후 이용할 수 있는 기능입니다.',
        en: 'Please log in to use this feature.',
        ja: 'この機能はログイン後にご利用いただけます。'
    }[lang] || '로그인 후 이용할 수 있는 기능입니다.';

    let toast = document.getElementById('authLoginToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'authLoginToast';
        toast.className = 'auth-toast';
        document.body.appendChild(toast);
    }

    toast.textContent = msg;
    // 혹시 이미 표시 중이면 타이머 리셋
    clearTimeout(toast._hideTimer);
    // 즉시 표시 (requestAnimationFrame으로 transition 트리거)
    toast.classList.add('show');
    toast._hideTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 캔버스를 Blob으로 변환 (Promise)
function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// 도안을 Firebase Storage + Firestore에 저장
export async function savePatternToCloud(patternCanvas, originalCanvas, legendHTML, infoText, settings, overwriteDocId = null) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const providerId = user.providerData[0]?.providerId;
    if (providerId === 'password' && !user.emailVerified) {
        throw new Error('Email not verified');
    }

    const patternId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const basePath = `users/${user.uid}/patterns/${patternId}`;

    const { storage, ref, uploadBytes, getDownloadURL } = await import('./firebase-storage.js');

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

    // 3. 숫자 파싱 (infoText: "120 Stitches x 150 Rows (approx. 50cm x 62.5cm)")
    const nums = (infoText || '').match(/\d+(\.\d+)?/g) || [];
    const stitches = parseInt(nums[0]) || 0;
    const rows = parseInt(nums[1]) || 0;
    const widthCm = parseFloat(nums[2]) || 0;
    const heightCm = parseFloat(nums[3]) || 0;

    // 4. PDF용 base64 생성 (save 시점에 canvas 직접 접근 → CORS 불필요)
    //    최대 600px로 축소 후 JPEG 0.9 → Firestore에 저장
    let patternBase64 = null;
    try {
        const maxDim = 600;
        const scale = Math.min(1, maxDim / Math.max(patternCanvas.width, patternCanvas.height));
        const b64Canvas = Object.assign(document.createElement('canvas'), {
            width: Math.round(patternCanvas.width * scale),
            height: Math.round(patternCanvas.height * scale)
        });
        b64Canvas.getContext('2d').drawImage(patternCanvas, 0, 0, b64Canvas.width, b64Canvas.height);
        patternBase64 = b64Canvas.toDataURL('image/jpeg', 0.9);
    } catch (e) { /* canvas 접근 실패 시 null 유지 */ }

    // 5. Firestore에 메타데이터 저장
    const defaultTitle = `도안 ${new Date().toLocaleDateString('ko-KR')}`;
    const patternsRef = collection(db, `users/${user.uid}/patterns`);
    const docData = {
        title: settings.title || defaultTitle,
        name: settings.title || defaultTitle, // 하위 호환
        tags: settings.tags || [],
        patternImageURL,
        originalImageURL,
        patternStoragePath: `${basePath}/pattern.png`,
        patternBase64,
        legendHTML,
        stitches,
        rows,
        widthCm,
        heightCm,
        yarnType: settings.yarnType || null,
        yarnMm: settings.yarnMm ? parseFloat(settings.yarnMm) : null,
        colorCount: settings.colorCount || 0,
        showGrid: settings.showGrid || false,
        techniqueRatio: settings.techniqueRatio || 1,
        createdAt: serverTimestamp()
    };

    let savedDocId;
    if (overwriteDocId) {
        await setDoc(doc(patternsRef, overwriteDocId), docData);
        savedDocId = overwriteDocId;
    } else {
        const docRef = await addDoc(patternsRef, docData);
        savedDocId = docRef.id;
    }
    return savedDocId;
}

// ==========================================
// 팔로우 기능 (follows 컬렉션)
// ==========================================

export async function followUser(targetUid) {
    const user = auth.currentUser;
    if (!user) throw new Error('로그인이 필요합니다.');
    if (user.uid === targetUid) throw new Error('자기 자신을 팔로우할 수 없습니다.');

    // uid 조합을 문서 ID로 사용하여 중복 방지 및 빠른 조회 보장
    const docId = `${user.uid}_${targetUid}`;
    const followRef = doc(db, 'follows', docId);

    await setDoc(followRef, {
        followerId: user.uid,
        followingId: targetUid,
        createdAt: serverTimestamp()
    });
}

export async function unfollowUser(targetUid) {
    const user = auth.currentUser;
    if (!user) throw new Error('로그인이 필요합니다.');

    const docId = `${user.uid}_${targetUid}`;
    await deleteDoc(doc(db, 'follows', docId));
}

export async function isFollowing(targetUid) {
    const user = auth.currentUser;
    if (!user) return false;

    const docId = `${user.uid}_${targetUid}`;
    const snap = await getDoc(doc(db, 'follows', docId));
    return snap.exists();
}

