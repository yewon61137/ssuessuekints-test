// mypage.js — 마이페이지 (4탭: 프로필 수정 / 내 도안 / 내 글 / 스크랩)

import { auth, db, storage, initAuth, openAuthModal, getUserProfile, updateUserProfile, checkNicknameAvailable } from './auth.js';
import { t as sharedT, applyLang as _applyLang } from './i18n.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
    collection, query, orderBy, limit, getDocs,
    doc, getDoc, deleteDoc, updateDoc, where
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { ref, deleteObject, getBlob } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

// --- i18n (페이지별 문자열) ---
const pageT = {
    ko: {
        mypage: '마이페이지', not_logged_in: '로그인하면 마이페이지를 이용할 수 있습니다.',
        go_to_signin: '로그인', loading: '불러오는 중...',
        empty_patterns: '저장된 도안이 없습니다. 도안을 생성하고 저장해보세요!',
        empty_posts: '작성한 글이 없습니다.', empty_scraps: '스크랩한 글이 없습니다.',
        rename: '이름변경', view_original: '원본', delete: '삭제',
        confirm_delete: '이 도안을 삭제하시겠습니까?', rename_prompt: '새 도안 이름을 입력하세요:',
        stitches: '코', rows: '단', go_generate: '← 도안 만들기',
        tab_profile: '프로필 수정', tab_mypatterns: '내 도안', tab_myposts: '내 글', tab_scraps: '스크랩',
        profile_save: '저장', profile_saving: '저장 중...', profile_saved: '저장되었습니다.',
        nickname_check: '중복 확인', nickname_checking: '확인 중...',
        nickname_ok: '사용 가능한 닉네임입니다.', nickname_taken: '이미 사용 중인 닉네임입니다.',
        nickname_invalid: '닉네임은 2~20자의 한글·영문·숫자·_만 사용할 수 있습니다.',
        profile_edit_error: '저장 중 오류가 발생했습니다.',
        photo_change: '사진 변경',
        placeholder_nickname: '닉네임 (2~20자, 필수)',
        placeholder_realname: '실명 (선택)',
        mypatterns_title: '내 도안',
    },
    en: {
        mypage: 'My Page', not_logged_in: 'Sign in to access your page.',
        go_to_signin: 'Sign In', loading: 'Loading...',
        empty_patterns: 'No saved patterns yet. Generate a pattern and save it!',
        empty_posts: 'No posts yet.', empty_scraps: 'No scrapped posts yet.',
        rename: 'Rename', view_original: 'Original', delete: 'Delete',
        confirm_delete: 'Delete this pattern?', rename_prompt: 'Enter new pattern name:',
        stitches: 'sts', rows: 'rows', go_generate: '← Create Pattern',
        tab_profile: 'Edit Profile', tab_mypatterns: 'My Patterns', tab_myposts: 'My Posts', tab_scraps: 'Scraps',
        profile_save: 'Save', profile_saving: 'Saving...', profile_saved: 'Saved.',
        nickname_check: 'Check', nickname_checking: 'Checking...',
        nickname_ok: 'Available.', nickname_taken: 'Already in use.',
        nickname_invalid: '2-20 chars: letters, numbers, _',
        profile_edit_error: 'Error saving profile.',
        photo_change: 'Change Photo',
        placeholder_nickname: 'Nickname (2-20 chars, required)',
        placeholder_realname: 'Real name (optional)',
        mypatterns_title: 'My Patterns',
    },
    ja: {
        mypage: 'マイページ', not_logged_in: 'ログインしてマイページを利用できます。',
        go_to_signin: 'ログイン', loading: '読み込み中...',
        empty_patterns: '保存された編み図がありません。編み図を生成して保存してください！',
        empty_posts: '投稿した記事がありません。', empty_scraps: 'スクラップした記事がありません。',
        rename: '名前変更', view_original: '原画', delete: '削除',
        confirm_delete: 'この編み図を削除しますか？', rename_prompt: '新しい名前を入力してください:',
        stitches: '目', rows: '段', go_generate: '← 編み図を作る',
        tab_profile: 'プロフィール編集', tab_mypatterns: 'マイ編み図', tab_myposts: '投稿', tab_scraps: 'スクラップ',
        profile_save: '保存', profile_saving: '保存中...', profile_saved: '保存されました。',
        nickname_check: '確認', nickname_checking: '確認中...',
        nickname_ok: '使用可能です。', nickname_taken: '既に使用されています。',
        nickname_invalid: '2〜20文字（ひらがな・英数字・_）',
        profile_edit_error: '保存中にエラーが発生しました。',
        photo_change: '写真変更',
        placeholder_nickname: 'ニックネーム（2〜20文字、必須）',
        placeholder_realname: '本名（任意）',
        mypatterns_title: 'マイ編み図',
    }
};

let currentLang = 'ko';
function tr(key) { return (pageT[currentLang]?.[key] ?? sharedT[currentLang]?.[key]) || key; }

// --- URL 파라미터로 타인 프로필 여부 판단 ---
const urlUid = new URLSearchParams(location.search).get('uid');

// --- DOM refs ---
const notLoggedInEl = document.getElementById('notLoggedIn');
const loggedInEl = document.getElementById('loggedIn');
const gotoSignInBtn = document.getElementById('gotoSignInBtn');
const langBtns = document.querySelectorAll('.lang-btn[data-lang]');
const loadingMsgEl = document.getElementById('loadingMsg');
const emptyMsgEl = document.getElementById('emptyMsg');
const patternGridEl = document.getElementById('patternGrid');

// --- Language ---
function applyLang(lang) {
    currentLang = lang;
    _applyLang(lang, { extra: pageT });

    document.getElementById('mypageTitle').textContent = tr('mypage');
    const myPatternsTitle = document.getElementById('myPatternsTitle');
    if (myPatternsTitle) myPatternsTitle.textContent = tr('mypatterns_title');
    const goGenerateLink = document.getElementById('goGenerateLink');
    if (goGenerateLink) goGenerateLink.textContent = tr('go_generate');
    document.getElementById('notLoggedInMsg').textContent = tr('not_logged_in');
    gotoSignInBtn.textContent = tr('go_to_signin');
    if (loadingMsgEl) loadingMsgEl.textContent = tr('loading');
    if (emptyMsgEl) emptyMsgEl.textContent = tr('empty_patterns');

    // 탭 레이블
    document.querySelectorAll('.mypage-tab').forEach(btn => {
        const tab = btn.getAttribute('data-tab');
        const val = pageT[lang]?.['tab_' + tab];
        if (val) btn.textContent = val;
    });

    // 프로필 편집 패널 — placeholder & label 번역
    const editNicknameEl = document.getElementById('editNickname');
    if (editNicknameEl) editNicknameEl.placeholder = tr('placeholder_nickname');
    const editRealNameEl = document.getElementById('editRealName');
    if (editRealNameEl) editRealNameEl.placeholder = tr('placeholder_realname');
}

langBtns.forEach(btn => {
    btn.addEventListener('click', () => applyLang(btn.getAttribute('data-lang')));
});

applyLang(localStorage.getItem('lang') || 'ko');

// --- Tab 컨트롤러 ---
let currentTab = 'profile';
let currentUid = null;
let isMine = true; // 본인 프로필 여부
const tabLoaded = { profile: false, mypatterns: false, myposts: false, scraps: false };

const panelIds = {
    profile: 'panelProfile',
    mypatterns: 'panelMyPatterns',
    myposts: 'panelMyPosts',
    scraps: 'panelScraps'
};

function switchTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll('.mypage-tab').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });
    document.querySelectorAll('.mypage-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    const panel = document.getElementById(panelIds[tabName]);
    if (panel) panel.classList.add('active');

    if (!currentUid) return;
    // myposts는 항상 최신 목록을 보여주기 위해 매번 재로드
    if (tabName === 'myposts') {
        loadMyPosts(currentUid);
    } else if (!tabLoaded[tabName]) {
        tabLoaded[tabName] = true;
        if (tabName === 'profile') loadProfilePanel(currentUid);
        else if (tabName === 'mypatterns') loadPatterns(currentUid);
        else if (tabName === 'scraps') loadScraps(currentUid);
    }
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

document.querySelectorAll('.mypage-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
});

// --- Profile 패널 ---
let editNicknameChecked = false;
let editNicknameAvailable = false;
let originalNickname = '';

async function loadProfilePanel(uid) {
    const profile = await getUserProfile(uid);
    if (!profile) return;

    originalNickname = profile.nickname || '';
    document.getElementById('editNickname').value = originalNickname;
    document.getElementById('editRealName').value = profile.displayName || '';
    const editBioEl = document.getElementById('editBio');
    if (editBioEl) editBioEl.value = profile.bio || '';

    // 아바타 미리보기
    const avatarEl = document.getElementById('editAvatarPreview');
    if (profile.profilePhotoURL) {
        avatarEl.style.backgroundImage = `url(${profile.profilePhotoURL})`;
        avatarEl.innerHTML = '';
    } else {
        avatarEl.style.backgroundImage = '';
        avatarEl.innerHTML = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
    }

    // 초기 상태: 닉네임이 그대로면 저장 버튼 활성화
    editNicknameChecked = true;
    editNicknameAvailable = true;
    document.getElementById('profileEditSaveBtn').disabled = false;
}

// 프로필 편집 이벤트
(function initProfileEditPanel() {
    const nicknameInput = document.getElementById('editNickname');
    const checkBtn = document.getElementById('editCheckNicknameBtn');
    const statusEl = document.getElementById('editNicknameStatus');
    const photoInput = document.getElementById('editPhotoInput');
    const avatarEl = document.getElementById('editAvatarPreview');
    const saveBtn = document.getElementById('profileEditSaveBtn');
    const msgEl = document.getElementById('profileEditMsg');

    nicknameInput.addEventListener('input', () => {
        editNicknameChecked = false;
        editNicknameAvailable = false;
        statusEl.style.display = 'none';
        // 닉네임이 원래와 같으면 저장 버튼 활성 유지
        saveBtn.disabled = nicknameInput.value.trim() !== originalNickname;
        if (nicknameInput.value.trim() === originalNickname) {
            editNicknameChecked = true;
            editNicknameAvailable = true;
        }
    });

    photoInput.addEventListener('change', () => {
        const file = photoInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            avatarEl.style.backgroundImage = `url(${e.target.result})`;
            avatarEl.innerHTML = '';
        };
        reader.readAsDataURL(file);
    });

    checkBtn.addEventListener('click', async () => {
        const nickname = nicknameInput.value.trim();
        if (!/^[a-zA-Z0-9가-힣_]{2,20}$/.test(nickname)) {
            statusEl.textContent = tr('nickname_invalid');
            statusEl.className = 'nickname-status error';
            statusEl.style.display = 'block';
            return;
        }
        if (nickname === originalNickname) {
            statusEl.textContent = tr('nickname_ok');
            statusEl.className = 'nickname-status success';
            statusEl.style.display = 'block';
            editNicknameChecked = true;
            editNicknameAvailable = true;
            saveBtn.disabled = false;
            return;
        }
        checkBtn.disabled = true;
        checkBtn.textContent = tr('nickname_checking');
        try {
            const available = await checkNicknameAvailable(nickname);
            editNicknameChecked = true;
            editNicknameAvailable = available;
            statusEl.textContent = available ? tr('nickname_ok') : tr('nickname_taken');
            statusEl.className = 'nickname-status ' + (available ? 'success' : 'error');
            statusEl.style.display = 'block';
            saveBtn.disabled = !available;
        } catch {
            statusEl.textContent = '오류가 발생했습니다.';
            statusEl.className = 'nickname-status error';
            statusEl.style.display = 'block';
        } finally {
            checkBtn.disabled = false;
            checkBtn.textContent = tr('nickname_check');
        }
    });

    document.getElementById('profileEditForm').addEventListener('submit', async e => {
        e.preventDefault();
        if (!editNicknameChecked || !editNicknameAvailable) {
            msgEl.textContent = '닉네임 중복 확인을 완료해주세요.';
            msgEl.className = 'nickname-status error';
            msgEl.style.display = 'block';
            return;
        }
        const nickname = nicknameInput.value.trim();
        const realName = document.getElementById('editRealName').value.trim();
        const bioEl = document.getElementById('editBio');
        const bio = bioEl ? bioEl.value.trim() : '';
        const photoFile = photoInput.files[0] || null;
        const uid = currentUid;

        saveBtn.disabled = true;
        saveBtn.textContent = tr('profile_saving');
        msgEl.style.display = 'none';

        try {
            await updateUserProfile(uid, { nickname, currentNickname: originalNickname, realName, bio, photoFile });
            originalNickname = nickname;
            photoInput.value = '';
            // 헤더 닉네임 갱신
            const userEmailEl = document.getElementById('authUserEmail');
            if (userEmailEl) userEmailEl.textContent = nickname;
            msgEl.textContent = tr('profile_saved');
            msgEl.className = 'nickname-status success';
            msgEl.style.display = 'block';
        } catch (err) {
            msgEl.textContent = tr('profile_edit_error') + ' ' + err.message;
            msgEl.className = 'nickname-status error';
            msgEl.style.display = 'block';
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = tr('profile_save');
        }
    });
})();

// --- Load Patterns ---
async function loadPatterns(uid) {
    loadingMsgEl.style.display = 'block';
    emptyMsgEl.style.display = 'none';
    patternGridEl.innerHTML = '';

    try {
        const q = query(
            collection(db, `users/${uid}/patterns`),
            orderBy('createdAt', 'desc'),
            limit(50)
        );
        const snap = await getDocs(q);
        loadingMsgEl.style.display = 'none';
        let count = 0;
        snap.forEach(docSnap => {
            const data = docSnap.data();
            patternGridEl.appendChild(buildPatternCard(uid, docSnap.id, data));
            count++;
        });
        if (count === 0) emptyMsgEl.style.display = 'block';
    } catch (e) {
        console.error('Failed to load patterns:', e);
        loadingMsgEl.textContent = '불러오기 실패. 다시 시도해주세요.';
    }
}

function buildPatternCard(uid, patternId, data) {
    const card = document.createElement('div');
    card.className = 'pattern-card';
    const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('ko-KR') : '';
    const displayName = escHtml(data.title || data.name || '');

    // 세부 설정 텍스트
    const yarnInfo = data.yarnType ? data.yarnType : (data.yarnMm ? `${data.yarnMm}mm` : '');
    const sizeInfo = data.widthCm
        ? (data.heightCm ? `${data.widthCm}cm × ${data.heightCm}cm` : `${data.widthCm}cm`)
        : '';
    const settingsParts = [yarnInfo, sizeInfo].filter(Boolean);
    const settingsText = settingsParts.length ? ` · ${settingsParts.join(' · ')}` : '';
    const publicBadge = '';

    const actionsHtml = isMine ? `
          <div class="pattern-card-actions">
            <button class="rename-btn">${tr('rename')}</button>
            <a href="${data.originalImageURL}" target="_blank" rel="noopener">${tr('view_original')}</a>
            <button class="pdf-btn">PDF</button>
            <button class="png-download-btn">PNG</button>
            <button class="delete-btn">${tr('delete')}</button>
          </div>` : `
          <div class="pattern-card-actions">
            <a href="${data.originalImageURL}" target="_blank" rel="noopener">${tr('view_original')}</a>
            <button class="pdf-btn">PDF</button>
            <button class="png-download-btn">PNG</button>
          </div>`;

    card.innerHTML = `
        <img class="pattern-card-thumb" src="${data.patternImageURL}" alt="${displayName}" loading="lazy"
             onerror="this.style.background='#eee'">
        <div class="pattern-card-body">
          <div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;">
            <p class="pattern-card-name" title="${displayName}" style="margin:0;flex:1;">${displayName}</p>
            ${publicBadge}
          </div>
          <p class="pattern-card-meta">${data.stitches}${tr('stitches')} × ${data.rows}${tr('rows')}${settingsText}</p>
          ${actionsHtml}
        </div>
    `;

    card.querySelector('.pattern-card-thumb').addEventListener('click', () => window.open(data.patternImageURL, '_blank'));

    // PDF/PNG 공통 헬퍼: jsPDF로 도안 PDF 생성
    // TODO: Google AdSense 승인 후 다운로드 직전 광고 모달 표시 로직 추가
    function generatePatternPdf(imgSrc, cleanup) {
        if (typeof window.jspdf === 'undefined') {
            alert('PDF 라이브러리를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
            if (cleanup) cleanup();
            return;
        }
        const { jsPDF } = window.jspdf;
        const safeName = (data.title || data.name || 'pattern').replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
        const img = new Image();
        img.onload = () => {
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();
            const margin = 15;
            const maxW = pdfW - margin * 2;
            const maxH = pdfH - margin * 2 - 35;
            let finalW = maxW;
            let finalH = (img.height / img.width) * finalW;
            if (finalH > maxH) { finalH = maxH; finalW = (img.width / img.height) * finalH; }

            // 제목 (한글 포함 가능 — canvas에 그려서 이미지로 삽입)
            const titleText = data.title || data.name || 'Knitting Pattern';
            const titleCanvas = document.createElement('canvas');
            titleCanvas.width = 900;
            titleCanvas.height = 36;
            const tCtx = titleCanvas.getContext('2d');
            tCtx.font = '600 26px sans-serif';
            tCtx.fillStyle = '#000000';
            tCtx.fillText(titleText, 0, 26);
            pdf.addImage(titleCanvas.toDataURL('image/png'), 'PNG', margin, margin, maxW, maxW * 36 / 900);

            // 정보 줄 (원래 도안 PDF와 동일한 포맷)
            pdf.setFontSize(10);
            const sizeStr = (data.widthCm && data.heightCm)
                ? `${data.widthCm}cm x ${data.heightCm}cm`
                : (data.widthCm ? `${data.widthCm}cm` : '');
            const infoLine = `${data.stitches || 0} Stitches x ${data.rows || 0} Rows` +
                (sizeStr ? ` (${sizeStr})` : '') +
                (data.yarnType ? ` · ${data.yarnType}` : (data.yarnMm ? ` · ${data.yarnMm}mm` : ''));
            pdf.text(infoLine, margin, margin + 14);

            // 도안 이미지
            const tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = img.width;
            tmpCanvas.height = img.height;
            tmpCanvas.getContext('2d').drawImage(img, 0, 0);
            const imgData = tmpCanvas.toDataURL('image/jpeg', 0.92);
            pdf.addImage(imgData, 'JPEG', margin, margin + 22, finalW, finalH);

            // 색상 범례
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
                        pdf.setFontSize(10);
                        pdf.text(item.querySelector('span')?.textContent || '', margin + 13, y + 6);
                        y += 13;
                        if (y > pdfH - margin) y = margin;
                    }
                });
            }
            pdf.save(`${safeName}.pdf`);
            if (cleanup) cleanup();
        };
        img.onerror = () => {
            if (cleanup) cleanup();
            alert('이미지를 불러오지 못했습니다.');
        };
        img.src = imgSrc;
    }

    // PDF 다운로드
    card.querySelector('.pdf-btn').addEventListener('click', async () => {
        // 1순위: patternBase64 (저장 시점에 canvas에서 직접 생성 → CORS 완전 불필요)
        if (data.patternBase64) {
            generatePatternPdf(data.patternBase64, null);
            return;
        }
        // 2순위: Firebase Storage getBlob (Storage 규칙 배포된 경우)
        if (data.patternStoragePath) {
            try {
                const blob = await getBlob(ref(storage, data.patternStoragePath));
                const blobUrl = URL.createObjectURL(blob);
                generatePatternPdf(blobUrl, () => URL.revokeObjectURL(blobUrl));
                return;
            } catch (e) { /* fallback */ }
        }
        // 3순위: fetch (Firebase Storage CORS 설정된 경우)
        try {
            const res = await fetch(data.patternImageURL);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            generatePatternPdf(blobUrl, () => URL.revokeObjectURL(blobUrl));
            return;
        } catch (e) { /* fallback */ }
        // 최후: 원본 URL (구형 도안, canvas taint 가능)
        generatePatternPdf(data.patternImageURL, null);
    });

    // PNG 직접 저장
    card.querySelector('.png-download-btn').addEventListener('click', async () => {
        const safeName = (data.title || data.name || 'pattern').replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
        // patternBase64에서 직접 다운로드 (CORS 불필요)
        if (data.patternBase64) {
            const a = document.createElement('a');
            a.href = data.patternBase64;
            a.download = `${safeName}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return;
        }
        // getBlob() 시도
        if (data.patternStoragePath) {
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
        // fetch fallback
        try {
            const res = await fetch(data.patternImageURL);
            if (!res.ok) throw new Error();
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `${safeName}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        } catch (e) {
            window.open(data.patternImageURL, '_blank');
        }
    });

    if (isMine) {
        card.querySelector('.rename-btn').addEventListener('click', async () => {
            const currentName = data.title || data.name || '';
            const newName = window.prompt(tr('rename_prompt'), currentName);
            if (!newName || newName.trim() === currentName) return;
            const trimmed = newName.trim();
            try {
                await updateDoc(doc(db, `users/${uid}/patterns/${patternId}`), { title: trimmed, name: trimmed });
                card.querySelector('.pattern-card-name').textContent = trimmed;
                card.querySelector('.pattern-card-name').title = trimmed;
                data.title = trimmed;
                data.name = trimmed;
            } catch (e) { console.error('Rename failed:', e); }
        });

        card.querySelector('.delete-btn').addEventListener('click', async () => {
            if (!window.confirm(tr('confirm_delete'))) return;
            try {
                const basePath = `users/${uid}/patterns/${patternId}`;
                await Promise.allSettled([
                    deleteObject(ref(storage, `${basePath}/pattern.png`)),
                    deleteObject(ref(storage, `${basePath}/original.jpg`))
                ]);
                await deleteDoc(doc(db, `users/${uid}/patterns/${patternId}`));
                card.remove();
                if (patternGridEl.children.length === 0) emptyMsgEl.style.display = 'block';
            } catch (e) { console.error('Delete failed:', e); }
        });
    }

    return card;
}

// --- Load My Posts ---
async function loadMyPosts(uid) {
    const loadingEl = document.getElementById('myPostsLoading');
    const emptyEl = document.getElementById('myPostsEmpty');
    const gridEl = document.getElementById('myPostsGrid');
    loadingEl.style.display = 'block';
    emptyEl.style.display = 'none';
    gridEl.innerHTML = '';

    try {
        const q = query(
            collection(db, 'posts'),
            where('uid', '==', uid)
        );
        const snap = await getDocs(q);
        loadingEl.style.display = 'none';
        if (snap.empty) { emptyEl.style.display = 'block'; return; }
        // 최신순 정렬 (클라이언트)
        const docs = snap.docs.sort((a, b) => {
            const at = a.data().createdAt?.seconds || 0;
            const bt = b.data().createdAt?.seconds || 0;
            return bt - at;
        });
        let count = 0;
        docs.forEach(docSnap => {
            const data = docSnap.data();
            // 타인 프로필: 공개 게시글만 표시
            if (!isMine && data.isPublic === false) return;
            gridEl.appendChild(buildPostCard(docSnap.id, data));
            count++;
        });
        if (count === 0) emptyEl.style.display = 'block';
    } catch (e) {
        console.error('loadMyPosts error:', e);
        loadingEl.style.display = 'none';
        // 실제 오류 메시지를 노출해 진단 가능하도록
        emptyEl.textContent = `오류: ${e.message}`;
        emptyEl.style.display = 'block';
    }
}

// --- Load Scraps ---
async function loadScraps(uid) {
    const loadingEl = document.getElementById('scrapsLoading');
    const emptyEl = document.getElementById('scrapsEmpty');
    const gridEl = document.getElementById('scrapsGrid');
    loadingEl.style.display = 'block';
    emptyEl.style.display = 'none';
    gridEl.innerHTML = '';

    try {
        const scrapsSnap = await getDocs(
            query(collection(db, `users/${uid}/scraps`), orderBy('scrappedAt', 'desc'), limit(50))
        );
        if (scrapsSnap.empty) {
            loadingEl.style.display = 'none';
            emptyEl.style.display = 'block';
            return;
        }
        const postDocs = await Promise.all(
            scrapsSnap.docs.map(s => getDoc(doc(db, 'posts', s.id)))
        );
        loadingEl.style.display = 'none';
        let count = 0;
        postDocs.forEach(postDoc => {
            if (postDoc.exists()) {
                gridEl.appendChild(buildPostCard(postDoc.id, postDoc.data()));
                count++;
            }
        });
        if (count === 0) emptyEl.style.display = 'block';
    } catch (e) {
        console.error('Failed to load scraps:', e);
        loadingEl.textContent = '불러오기 실패.';
    }
}

function buildPostCard(postId, data) {
    const card = document.createElement('a');
    card.className = 'post-card';
    card.href = `/post.html?id=${postId}`;

    const date = data.createdAt
        ? new Date(data.createdAt.seconds * 1000).toLocaleString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';
    const thumb = data.images && data.images[0]
        ? `<div class="post-card-thumb" style="background-image:url(${escHtml(data.images[0])})"></div>`
        : (data.patternImageURL ? `<div class="post-card-thumb" style="background-image:url(${escHtml(data.patternImageURL)})"></div>` : '<div class="post-card-thumb post-card-thumb-empty"></div>');
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
          <div class="post-card-meta">${avatarHtml}${authorHtml}<span class="post-card-date"> · ${date}</span><span class="post-card-counts"> · ♥ ${data.likeCount || 0}</span></div>
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

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 타인 프로필 뷰: 탭을 도안/게시글만 보이도록 설정
function setupOtherUserView(profile) {
    // 프로필수정/내도안/스크랩 탭·패널 완전 제거 (타인 프로필: 공개글만)
    document.querySelectorAll('.mypage-tab').forEach(btn => {
        const tab = btn.getAttribute('data-tab');
        if (tab === 'profile' || tab === 'mypatterns' || tab === 'scraps') btn.remove();
    });
    const removeIds = ['panelProfile', 'panelMyPatterns', 'panelScraps'];
    removeIds.forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });

    // 프로필 헤더 표시
    const headerEl = document.getElementById('otherProfileHeader');
    if (headerEl) {
        headerEl.style.display = 'flex';
        const avatarEl = document.getElementById('otherProfileAvatar');
        if (profile?.profilePhotoURL) {
            avatarEl.style.backgroundImage = `url(${profile.profilePhotoURL})`;
            avatarEl.innerHTML = '';
        } else {
            avatarEl.style.backgroundImage = '';
            avatarEl.innerHTML = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
        }
        const nicknameEl = document.getElementById('otherProfileNickname');
        if (nicknameEl) nicknameEl.textContent = profile?.nickname || '';
    }

    // 타이틀
    const nickname = profile?.nickname;
    const title = nickname ? `${nickname}님의 프로필` : '프로필';
    document.getElementById('mypageTitle').textContent = title;
    // 첫 탭을 내 글로 (타인 프로필은 공개글만)
    switchTab('myposts');
}

// --- Auth + 페이지 초기화 ---
function initPageAuth() {
    initAuth();
    gotoSignInBtn.addEventListener('click', openAuthModal);

    onAuthStateChanged(auth, async user => {
        const isVerified = !!user;

        if (urlUid) {
            // 타인 프로필 모드: 로그인 여부 관계없이 표시
            isMine = isVerified && user && user.uid === urlUid;
            notLoggedInEl.style.display = 'none';
            loggedInEl.style.display = 'block';
            currentUid = urlUid;

            if (!tabLoaded['_init']) {
                tabLoaded['_init'] = true;
                // 타인 프로필 정보 로드
                const profile = await getUserProfile(urlUid);
                setupOtherUserView(profile || null);
            }
        } else if (isVerified) {
            // 본인 프로필 모드
            isMine = true;
            notLoggedInEl.style.display = 'none';
            loggedInEl.style.display = 'block';
            currentUid = user.uid;
            if (!tabLoaded['profile']) {
                tabLoaded['profile'] = true;
                await loadProfilePanel(user.uid);
            }
        } else {
            notLoggedInEl.style.display = 'block';
            loggedInEl.style.display = 'none';
            currentUid = null;
        }
    });
}

initPageAuth();
