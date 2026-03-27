// auth.js — Firebase 초기화 + 인증 + 도안 저장 + 프로필 관리
// Firebase 10 CDN ES 모듈 사용 (빌드 불필요)

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithCustomToken,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    sendEmailVerification,
    applyActionCode,
    deleteUser,
    setPersistence,
    browserSessionPersistence,
    browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    updateDoc
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    listAll,
    deleteObject
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

// ⚠️ firebase-config.js 파일에서 설정을 수정하세요
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence).catch(() => {});

export async function applyAuthPersistence() {
    const rm = document.getElementById('rememberMeCheck');
    const type = (rm && rm.checked) ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, type);
}
export const db = getFirestore(app);
export const storage = getStorage(app);

export function getCurrentUser() {
    return auth.currentUser;
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

// onAuthStateChanged 리스너를 헤더 UI 업데이트에 연결
export function initAuth() {
    const signInBtn = document.getElementById('authSignInBtn');
    const userArea = document.getElementById('authUserArea');
    const userEmail = document.getElementById('authUserEmail');
    const signOutBtn = document.getElementById('authSignOutBtn');
    const modal = document.getElementById('authModal');

    if (!signInBtn) return; // auth-area가 없는 페이지에서는 중단

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

    // 로그아웃 버튼
    signOutBtn.addEventListener('click', () => {
        signOut(auth);
        stopVerificationCheck();
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

    // Google 로그인
    document.getElementById('googleSignInBtn').addEventListener('click', async () => {
        clearModalError();
        try {
            await applyAuthPersistence();
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            // 프로필 완성 여부 확인
            const complete = await isProfileComplete(user.uid);
            if (!complete) {
                showProfileSetup(user);
            } else {
                modal.style.display = 'none';
                callOnAuthComplete();
            }
        } catch (e) {
            showModalError(e.message);
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
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'flex';
        clearModalError();
    }
}

// 캔버스를 Blob으로 변환 (Promise)
function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// 도안을 Firebase Storage + Firestore에 저장
export async function savePatternToCloud(patternCanvas, originalCanvas, legendHTML, infoText, settings) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const providerId = user.providerData[0]?.providerId;
    if (providerId === 'password' && !user.emailVerified) {
        throw new Error('Email not verified');
    }

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
    await addDoc(patternsRef, {
        title: settings.title || defaultTitle,
        name: settings.title || defaultTitle, // 하위 호환
        tags: settings.tags || [],
        patternImageURL,
        originalImageURL,
        patternStoragePath: `${basePath}/pattern.png`,
        patternBase64,  // PDF 생성용 (CORS 없이 직접 사용)
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
    });
}
