// auth.js — Firebase 초기화 + 인증 + 도안 저장
// Firebase 10 CDN ES 모듈 사용 (빌드 불필요)

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp
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

    // 모달 외부 클릭 → 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            clearModalError();
        }
    });

    // 탭 전환
    document.getElementById('tabSignIn').addEventListener('click', () => switchTab('signin'));
    document.getElementById('tabSignUp').addEventListener('click', () => switchTab('signup'));

    // 모달 닫기 버튼
    document.getElementById('modalCloseBtn').addEventListener('click', () => {
        modal.style.display = 'none';
        clearModalError();
    });

    // Google 로그인
    document.getElementById('googleSignInBtn').addEventListener('click', async () => {
        clearModalError();
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            modal.style.display = 'none';
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
            await signInWithEmailAndPassword(auth, email, password);
            modal.style.display = 'none';
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
            await createUserWithEmailAndPassword(auth, email, password);
            modal.style.display = 'none';
        } catch (err) {
            showModalError(getAuthErrorMessage(err.code));
        }
    });
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
