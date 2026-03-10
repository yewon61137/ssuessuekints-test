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
    updateProfile,
    sendEmailVerification,
    applyActionCode
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp,
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    updateDoc
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

// 사용자 프로필 조회
export async function getUserProfile(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data();
}

// 사용자 프로필 수정 (마이페이지 탭에서 호출)
export async function updateUserProfile(uid, { nickname, currentNickname, realName, photoFile }) {
    let profilePhotoURL = null;

    // 기존 프로필 사진 URL 유지
    const existing = await getUserProfile(uid);
    profilePhotoURL = existing?.profilePhotoURL || null;

    // 새 사진 업로드
    if (photoFile) {
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
let verificationTimer = null;
let verificationFocusHandler = null;


function showProfileSetup(user) {
    pendingProfileUser = user;
    nicknameChecked = false;
    nicknameAvailable = false;
    stopVerificationCheck();

    const modal = document.getElementById('authModal');
    // 탭·Google 버튼·구분선 숨기기
    modal.querySelector('.modal-tabs').style.display = 'none';
    modal.querySelector('.google-btn').style.display = 'none';
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
            // 이메일 기반 가입 사용자인 경우 인증 여부 확인 (구글은 자동 인증됨)
            if (user.providerData.some(p => p.providerId === 'password') && !user.emailVerified) {
                // 인증되지 않은 이메일 사용자는 UI만 로그아웃 상태로 유지
                signInBtn.style.display = 'inline-block';
                userArea.style.display = 'none';
                return;
            }

            // 프로필 미완성 사용자는 프로필 설정 패널 표시 (이미 진행 중이 아닐 때)
            let nickname = null;
            if (!pendingProfileUser) {
                try {
                    const snap = await getDoc(doc(db, 'users', user.uid));
                    if (snap.exists()) {
                        const data = snap.data();
                        if (!data.profileCompleted) showProfileSetup(user);
                        nickname = data.nickname || null;
                    } else {
                        showProfileSetup(user);
                    }
                } catch (e) {
                    console.error('Profile check failed:', e);
                }
            }

            signInBtn.style.display = 'none';
            userArea.style.display = 'flex';
            // Firestore nickname 우선, 없으면 Auth displayName, 없으면 email
            userEmail.textContent = nickname || user.displayName || user.email || '';
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
                    else { modal.style.display = 'none'; hideProfileSetupUI(); }
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
