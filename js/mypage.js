// mypage.js — 마이페이지 v2 (사이드바 5탭 레이아웃)

import { auth, db, storage, initAuth, openAuthModal, getUserProfile, updateUserProfile, checkNicknameAvailable, deleteUserAccount } from './auth.js?v=6';
import { t as sharedT, initLang } from './i18n.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
    collection, collectionGroup, query, orderBy, limit, getDocs,
    doc, getDoc, deleteDoc, updateDoc, where
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { ref, deleteObject, getBlob } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

// ── i18n ──────────────────────────────────────────────────────────────────────

const pageT = {
    ko: {
        tab_profile: '프로필', tab_patterns: '내 도안함',
        tab_projects: '내 프로젝트', tab_posts: '내 글·댓글', tab_scraps: '스크랩',
        subtab_posts: '내 글', subtab_comments: '내 댓글',
        not_logged_in: '로그인하면 마이페이지를 이용할 수 있습니다.',
        go_to_signin: '로그인', loading: '불러오는 중...',
        empty_patterns: '아직 저장된 도안이 없어요.',
        empty_posts: '아직 작성한 글이 없어요.', empty_scraps: '스크랩한 게시글이 없어요.',
        empty_comments: '아직 작성한 댓글이 없어요.', empty_projects: '진행 중인 프로젝트가 없어요.',
        rename: '이름변경', view_original: '원본', delete: '삭제',
        confirm_delete: '이 도안을 삭제하시겠습니까?', rename_prompt: '새 도안 이름을 입력하세요:',
        stitches: '코', rows: '단', go_generate: '← 도안 만들기',
        profile_save: '변경사항 저장', profile_saving: '저장 중...', profile_saved: '저장되었습니다.',
        nickname_check: '중복 확인', nickname_checking: '확인 중...',
        nickname_ok: '사용 가능한 닉네임입니다.', nickname_taken: '이미 사용 중인 닉네임입니다.',
        nickname_invalid: '닉네임은 2~20자의 한글·영문·숫자·_만 사용할 수 있습니다.',
        profile_edit_error: '저장 중 오류가 발생했습니다.',
        photo_change: '사진 변경', label_nickname: '닉네임', label_bio: '자기소개',
        bio_placeholder: '자신을 소개해보세요! (최대 100자)',
        joined: '가입일', open_counter: '카운터 열기', done_badge: '완료',
        done_projects: '완료된 프로젝트', stat_patterns: '도안', stat_posts: '게시글', stat_scraps: '스크랩',
        unscrap: '스크랩 취소', confirm_unscrap: '스크랩을 취소하시겠습니까?',
        title_profile: '프로필', title_patterns: '내 도안함',
        title_projects: '내 프로젝트', title_posts: '내 글·댓글', title_scraps: '스크랩',
        row_label: '단', goal_label: '목표', no_goal: '목표 없음',
        progress_done: '% 완료', go_community: '커뮤니티 가기 →', go_counter: '단수 카운터 시작하기 →',
        tab_palettes: '내 팔레트', title_palettes: '내 팔레트',
        palette_open: '배색 도우미에서 열기', palette_delete: '삭제', palette_rename: '이름 변경',
        confirm_delete_palette: '이 팔레트를 삭제하시겠습니까?', palette_rename_prompt: '새 팔레트 이름:',
        empty_palettes: '저장된 팔레트가 없어요.',
    },
    en: {
        tab_profile: 'Profile', tab_patterns: 'My Patterns',
        tab_projects: 'Projects', tab_posts: 'Posts & Comments', tab_scraps: 'Scraps',
        subtab_posts: 'Posts', subtab_comments: 'Comments',
        not_logged_in: 'Sign in to access your page.',
        go_to_signin: 'Sign In', loading: 'Loading...',
        empty_patterns: 'No saved patterns yet.',
        empty_posts: 'No posts yet.', empty_scraps: 'No scrapped posts yet.',
        empty_comments: 'No comments yet.', empty_projects: 'No active projects.',
        rename: 'Rename', view_original: 'Original', delete: 'Delete',
        confirm_delete: 'Delete this pattern?', rename_prompt: 'Enter new pattern name:',
        stitches: 'sts', rows: 'rows', go_generate: '← Create Pattern',
        profile_save: 'Save Changes', profile_saving: 'Saving...', profile_saved: 'Saved.',
        nickname_check: 'Check', nickname_checking: 'Checking...',
        nickname_ok: 'Available.', nickname_taken: 'Already in use.',
        nickname_invalid: '2-20 chars: letters, numbers, _',
        profile_edit_error: 'Error saving profile.',
        photo_change: 'Change Photo', label_nickname: 'Nickname', label_bio: 'Bio',
        bio_placeholder: 'Tell us about yourself! (max 100 chars)',
        joined: 'Joined', open_counter: 'Open Counter', done_badge: 'Done',
        done_projects: 'Completed Projects', stat_patterns: 'Patterns', stat_posts: 'Posts', stat_scraps: 'Scraps',
        unscrap: 'Unscrap', confirm_unscrap: 'Remove this scrap?',
        title_profile: 'Profile', title_patterns: 'My Patterns',
        title_projects: 'My Projects', title_posts: 'Posts & Comments', title_scraps: 'Scraps',
        row_label: 'rows', goal_label: 'goal', no_goal: 'No goal',
        progress_done: '% done', go_community: 'Go to Community →', go_counter: 'Start Row Counter →',
        tab_palettes: 'My Palettes', title_palettes: 'My Palettes',
        palette_open: 'Open in Color Palette', palette_delete: 'Delete', palette_rename: 'Rename',
        confirm_delete_palette: 'Delete this palette?', palette_rename_prompt: 'New palette name:',
        empty_palettes: 'No saved palettes yet.',
    },
    ja: {
        tab_profile: 'プロフィール', tab_patterns: 'マイ編み図',
        tab_projects: 'プロジェクト', tab_posts: '投稿・コメント', tab_scraps: 'スクラップ',
        subtab_posts: '投稿', subtab_comments: 'コメント',
        not_logged_in: 'ログインしてマイページを利用できます。',
        go_to_signin: 'ログイン', loading: '読み込み中...',
        empty_patterns: '保存された編み図がありません。',
        empty_posts: '投稿した記事がありません。', empty_scraps: 'スクラップした記事がありません。',
        empty_comments: 'コメントがありません。', empty_projects: 'プロジェクトがありません。',
        rename: '名前変更', view_original: '原画', delete: '削除',
        confirm_delete: 'この編み図を削除しますか？', rename_prompt: '新しい名前を入力してください:',
        stitches: '目', rows: '段', go_generate: '← 編み図を作る',
        profile_save: '変更を保存', profile_saving: '保存中...', profile_saved: '保存されました。',
        nickname_check: '確認', nickname_checking: '確認中...',
        nickname_ok: '使用可能です。', nickname_taken: '既に使用されています。',
        nickname_invalid: '2〜20文字（ひらがな・英数字・_）',
        profile_edit_error: '保存中にエラーが発生しました。',
        photo_change: '写真変更', label_nickname: 'ニックネーム', label_bio: '自己紹介',
        bio_placeholder: '自己紹介をしてください！（最大100文字）',
        joined: '登録日', open_counter: 'カウンターを開く', done_badge: '完了',
        done_projects: '完了したプロジェクト', stat_patterns: '編み図', stat_posts: '投稿', stat_scraps: 'スクラップ',
        unscrap: 'スクラップ解除', confirm_unscrap: 'スクラップを解除しますか？',
        title_profile: 'プロフィール', title_patterns: 'マイ編み図',
        title_projects: 'マイプロジェクト', title_posts: '投稿・コメント', title_scraps: 'スクラップ',
        row_label: '段', goal_label: '目標', no_goal: '目標なし',
        progress_done: '% 完了', go_community: 'コミュニティへ →', go_counter: 'カウンター開始 →',
        tab_palettes: 'マイパレット', title_palettes: 'マイパレット',
        palette_open: '配色アシスタントで開く', palette_delete: '削除', palette_rename: '名前変更',
        confirm_delete_palette: 'このパレットを削除しますか？', palette_rename_prompt: '新しい名前を入力:',
        empty_palettes: '保存されたパレットがありません。',
    }
};

let currentLang = localStorage.getItem('lang') || 'ko';
function tr(key) { return pageT[currentLang]?.[key] ?? sharedT[currentLang]?.[key] ?? key; }

// ── 상태 ─────────────────────────────────────────────────────────────────────

const urlUid   = new URLSearchParams(location.search).get('uid'); // 타인 프로필 모드
let   viewMode = urlUid ? 'other' : 'mine'; // 'mine' | 'other'
let currentUid = null;
let currentPanel = urlUid ? 'posts' : 'profile'; // 타인 프로필은 글 목록부터 (도안은 본인 전용)
const panelLoaded = {};

// ── 언어 적용 ─────────────────────────────────────────────────────────────────
// initLang이 langChange를 발행하므로 여기서는 langChange만 수신해 placeholder 등 보조 처리만.
// applyLang(extra: pageT)가 data-i18n, .i18n, data-ko/en/ja 전부 처리함.

function applyPlaceholders(lang) {
    currentLang = lang;
    const bioEl = document.getElementById('editBio');
    if (bioEl) bioEl.placeholder = tr('bio_placeholder');
    const saveBtn = document.getElementById('profileEditSaveBtn');
    if (saveBtn && saveBtn.textContent !== tr('profile_saving')) saveBtn.textContent = tr('profile_save');
    const checkBtn = document.getElementById('editCheckNicknameBtn');
    if (checkBtn && checkBtn.textContent !== tr('nickname_checking')) checkBtn.textContent = tr('nickname_check');
}

window.addEventListener('langChange', e => applyPlaceholders(e.detail.lang));

// initLang: 언어 버튼 클릭 → applyLang(extra:pageT) → data-i18n/i18n 전체 처리 → langChange 발행
initLang({ extra: pageT });

// ── 탭 전환 ───────────────────────────────────────────────────────────────────

function switchPanel(name) {
    currentPanel = name;
    document.querySelectorAll('.mp-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.panel === name);
    });
    document.querySelectorAll('.mp-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('panel' + name.charAt(0).toUpperCase() + name.slice(1));
    if (panel) panel.classList.add('active');

    if (!currentUid) return;
    if (panelLoaded[name]) return;
    panelLoaded[name] = true;

    if (name === 'profile')   loadProfilePanel(currentUid);
    else if (name === 'patterns')  loadPatterns(currentUid);
    else if (name === 'projects')  loadProjects(currentUid);
    else if (name === 'posts')     loadMyPosts(currentUid);
    else if (name === 'scraps')    loadScraps(currentUid);
    else if (name === 'palettes')  loadPalettes(currentUid);
}

document.querySelectorAll('.mp-nav-btn[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
});

// ── 서브탭 (내 글·댓글) ────────────────────────────────────────────────────────

let postsSubtab = 'myposts';
document.querySelectorAll('.mp-subtab').forEach(btn => {
    btn.addEventListener('click', () => {
        postsSubtab = btn.dataset.subtab;
        document.querySelectorAll('.mp-subtab').forEach(b => b.classList.toggle('active', b === btn));
        document.getElementById('subPanelPosts').style.display     = postsSubtab === 'myposts'    ? '' : 'none';
        document.getElementById('subPanelComments').style.display  = postsSubtab === 'mycomments' ? '' : 'none';
        if (postsSubtab === 'mycomments' && currentUid && !panelLoaded['comments']) {
            panelLoaded['comments'] = true;
            loadMyComments(currentUid);
        }
    });
});

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function spinner(msg) {
    const d = document.createElement('div');
    d.className = 'mypage-empty mp-spinner';
    d.textContent = msg || tr('loading');
    return d;
}

// ── 사이드바 요약 채우기 ───────────────────────────────────────────────────────

async function fillSidebar(uid, readOnly = false) {
    const profile = await getUserProfile(uid);
    if (!profile) return;

    // 아바타
    const avatarEl = document.getElementById('mpAvatar');
    if (profile.profilePhotoURL) {
        avatarEl.style.backgroundImage = `url(${profile.profilePhotoURL})`;
        avatarEl.style.backgroundSize = 'cover';
        avatarEl.style.backgroundPosition = 'center';
        avatarEl.innerHTML = '';
    }
    // 닉네임
    const nickEl = document.getElementById('mpNickname');
    if (nickEl) nickEl.textContent = profile.nickname || '';
    // 가입일
    const joinEl = document.getElementById('mpJoined');
    if (joinEl && profile.joinedAt) {
        const d = new Date(profile.joinedAt.seconds * 1000);
        joinEl.textContent = `${tr('joined')} ${d.toLocaleDateString(currentLang === 'ko' ? 'ko-KR' : currentLang === 'ja' ? 'ja-JP' : 'en-US')}`;
    }

    // 도안 수, 스크랩 수는 본인 전용 — 타인 프로필에서는 숨김
    if (readOnly) {
        document.getElementById('mpStatPatterns')?.closest('.mp-stat')?.style.setProperty('display', 'none');
        document.getElementById('mpStatScraps')?.closest('.mp-stat')?.style.setProperty('display', 'none');
    }

    // 통계 (병렬)
    const statsQueries = [
        getDocs(query(collection(db, 'posts'), where('uid', '==', uid))),
    ];
    if (!readOnly) {
        statsQueries.push(getDocs(query(collection(db, `users/${uid}/patterns`), limit(500))));
        statsQueries.push(getDocs(query(collection(db, `users/${uid}/scraps`), limit(500))));
    }

    Promise.all(statsQueries).then((results) => {
        if (readOnly) {
            const [posts] = results;
            const poEl = document.getElementById('mpStatPosts');
            if (poEl) poEl.textContent = posts.size;
        } else {
            const [posts, patterns, scraps] = results;
            const pEl  = document.getElementById('mpStatPatterns');
            const poEl = document.getElementById('mpStatPosts');
            const scEl = document.getElementById('mpStatScraps');
            if (pEl)  pEl.textContent  = patterns.size;
            if (poEl) poEl.textContent = posts.size;
            if (scEl) scEl.textContent = scraps?.size ?? '—';
        }
    }).catch(() => {});
}

// ── 프로필 패널 ───────────────────────────────────────────────────────────────

let editNicknameChecked = false;
let editNicknameAvailable = false;
let originalNickname = '';

async function loadProfilePanel(uid) {
    const profile = await getUserProfile(uid);
    if (!profile) return;

    originalNickname = profile.nickname || '';
    const nickInput = document.getElementById('editNickname');
    if (nickInput) nickInput.value = originalNickname;
    const bioEl = document.getElementById('editBio');
    if (bioEl) bioEl.value = profile.bio || '';

    const avatarEl = document.getElementById('editAvatarPreview');
    if (avatarEl) {
        if (profile.profilePhotoURL) {
            avatarEl.style.backgroundImage = `url(${profile.profilePhotoURL})`;
            avatarEl.innerHTML = '';
        } else {
            avatarEl.style.backgroundImage = '';
            avatarEl.innerHTML = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
        }
    }

    editNicknameChecked = true;
    editNicknameAvailable = true;
    const saveBtn = document.getElementById('profileEditSaveBtn');
    if (saveBtn) saveBtn.disabled = false;
}

(function initProfilePanel() {
    const nickInput  = document.getElementById('editNickname');
    const checkBtn   = document.getElementById('editCheckNicknameBtn');
    const statusEl   = document.getElementById('editNicknameStatus');
    const photoInput = document.getElementById('editPhotoInput');
    const avatarEl   = document.getElementById('editAvatarPreview');
    const saveBtn    = document.getElementById('profileEditSaveBtn');
    const msgEl      = document.getElementById('profileEditMsg');

    if (!nickInput) return;

    nickInput.addEventListener('input', () => {
        editNicknameChecked = false;
        editNicknameAvailable = false;
        statusEl.style.display = 'none';
        const same = nickInput.value.trim() === originalNickname;
        saveBtn.disabled = !same;
        if (same) { editNicknameChecked = true; editNicknameAvailable = true; }
    });

    photoInput?.addEventListener('change', () => {
        const file = photoInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            avatarEl.style.backgroundImage = `url(${e.target.result})`;
            avatarEl.innerHTML = '';
        };
        reader.readAsDataURL(file);
    });

    checkBtn?.addEventListener('click', async () => {
        const nickname = nickInput.value.trim();
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
            editNicknameChecked = true; editNicknameAvailable = true;
            saveBtn.disabled = false;
            return;
        }
        checkBtn.disabled = true;
        checkBtn.textContent = tr('nickname_checking');
        try {
            const available = await checkNicknameAvailable(nickname);
            editNicknameChecked = true; editNicknameAvailable = available;
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

    document.getElementById('profileEditForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        if (!editNicknameChecked || !editNicknameAvailable) {
            msgEl.textContent = '닉네임 중복 확인을 완료해주세요.';
            msgEl.className = 'nickname-status error';
            msgEl.style.display = 'block';
            return;
        }
        const nickname  = nickInput.value.trim();
        const bio       = document.getElementById('editBio')?.value.trim() || '';
        const photoFile = photoInput?.files[0] || null;

        saveBtn.disabled = true;
        saveBtn.textContent = tr('profile_saving');
        msgEl.style.display = 'none';
        try {
            await updateUserProfile(currentUid, { nickname, currentNickname: originalNickname, bio, photoFile });
            originalNickname = nickname;
            if (photoInput) photoInput.value = '';
            // 사이드바 닉네임 갱신
            const nickEl = document.getElementById('mpNickname');
            if (nickEl) nickEl.textContent = nickname;
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

// ── 내 도안함 ─────────────────────────────────────────────────────────────────

async function loadPatterns(uid) {
    const loadingEl = document.getElementById('patternsLoading');
    const emptyEl   = document.getElementById('patternsEmpty');
    const gridEl    = document.getElementById('patternGrid');
    loadingEl.style.display = 'block';
    emptyEl.style.display   = 'none';
    gridEl.innerHTML = '';

    try {
        const snap = await getDocs(query(
            collection(db, `users/${uid}/patterns`),
            orderBy('createdAt', 'desc'), limit(50)
        ));
        loadingEl.style.display = 'none';
        if (snap.empty) { emptyEl.style.display = 'block'; return; }
        snap.forEach(ds => gridEl.appendChild(buildPatternCard(uid, ds.id, ds.data())));
    } catch (e) {
        loadingEl.textContent = '불러오기 실패. 다시 시도해주세요.';
        console.error(e);
    }
}

function buildPatternCard(uid, patternId, data) {
    const card = document.createElement('div');
    card.className = 'pattern-card';
    const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('ko-KR') : '';
    const displayName = escHtml(data.title || data.name || '');
    const yarnInfo  = data.yarnType || (data.yarnMm ? `${data.yarnMm}mm` : '');
    const sizeInfo  = data.widthCm ? (data.heightCm ? `${data.widthCm}cm × ${data.heightCm}cm` : `${data.widthCm}cm`) : '';
    const settingsText = [yarnInfo, sizeInfo].filter(Boolean).join(' · ');

    card.innerHTML = `
        <img class="pattern-card-thumb" src="${data.patternImageURL}" alt="${displayName}" loading="lazy" onerror="this.style.background='#eee'">
        <div class="pattern-card-body">
          <p class="pattern-card-name" title="${displayName}">${displayName}</p>
          <p class="pattern-card-meta">${data.stitches}${tr('stitches')} × ${data.rows}${tr('rows')}${settingsText ? ' · ' + settingsText : ''}</p>
          <p class="pattern-card-meta" style="color:#aaa;">${date}</p>
          <div class="pattern-card-actions">
            <button class="rename-btn">${tr('rename')}</button>
            <a href="${data.originalImageURL}" target="_blank" rel="noopener">${tr('view_original')}</a>
            <button class="pdf-btn">PDF</button>
            <button class="png-download-btn">PNG</button>
            <button class="delete-btn">${tr('delete')}</button>
          </div>
        </div>
    `;

    card.querySelector('.pattern-card-thumb').addEventListener('click', () => window.open(data.patternImageURL, '_blank'));

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
            const margin = 15, maxW = pdfW - margin * 2, maxH = pdfH - margin * 2 - 35;
            let finalW = maxW, finalH = (img.height / img.width) * finalW;
            if (finalH > maxH) { finalH = maxH; finalW = (img.width / img.height) * finalH; }

            const titleCanvas = document.createElement('canvas');
            titleCanvas.width = 900; titleCanvas.height = 36;
            const tCtx = titleCanvas.getContext('2d');
            tCtx.font = '600 26px sans-serif'; tCtx.fillStyle = '#000000';
            tCtx.fillText(data.title || data.name || 'Pattern', 0, 26);
            pdf.addImage(titleCanvas.toDataURL('image/png'), 'PNG', margin, margin, maxW, maxW * 36 / 900);

            pdf.setFontSize(10);
            const sizeStr = data.widthCm ? (data.heightCm ? `${data.widthCm}cm x ${data.heightCm}cm` : `${data.widthCm}cm`) : '';
            const infoLine = `${data.stitches || 0} Stitches x ${data.rows || 0} Rows`
                + (sizeStr ? ` (${sizeStr})` : '')
                + (data.yarnType ? ` · ${data.yarnType}` : (data.yarnMm ? ` · ${data.yarnMm}mm` : ''));
            pdf.text(infoLine, margin, margin + 14);

            const tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = img.width; tmpCanvas.height = img.height;
            tmpCanvas.getContext('2d').drawImage(img, 0, 0);
            pdf.addImage(tmpCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin + 22, finalW, finalH);

            if (data.legendHTML) {
                pdf.addPage();
                pdf.setFontSize(12); pdf.text('Color Legend', margin, margin + 5);
                const tmpDiv = document.createElement('div');
                tmpDiv.innerHTML = data.legendHTML;
                let y = margin + 15;
                tmpDiv.querySelectorAll('.color-item').forEach(item => {
                    const rgbMatch = item.querySelector('.color-box')?.style.backgroundColor.match(/\d+/g);
                    if (rgbMatch) {
                        pdf.setFillColor(+rgbMatch[0], +rgbMatch[1], +rgbMatch[2]);
                        pdf.rect(margin, y, 8, 8, 'F');
                        pdf.setDrawColor(0); pdf.rect(margin, y, 8, 8, 'S');
                        pdf.setFontSize(10); pdf.text(item.querySelector('span')?.textContent || '', margin + 13, y + 6);
                        y += 13;
                        if (y > pdfH - margin) y = margin;
                    }
                });
            }
            pdf.save(`${safeName}.pdf`);
            if (cleanup) cleanup();
        };
        img.onerror = () => { if (cleanup) cleanup(); alert('이미지를 불러오지 못했습니다.'); };
        img.src = imgSrc;
    }

    card.querySelector('.pdf-btn').addEventListener('click', async () => {
        if (data.patternBase64) { generatePatternPdf(data.patternBase64, null); return; }
        if (data.patternStoragePath) {
            try {
                const blob = await getBlob(ref(storage, data.patternStoragePath));
                const url = URL.createObjectURL(blob);
                generatePatternPdf(url, () => URL.revokeObjectURL(url)); return;
            } catch {}
        }
        try {
            const res = await fetch(data.patternImageURL);
            if (!res.ok) throw new Error();
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            generatePatternPdf(url, () => URL.revokeObjectURL(url)); return;
        } catch {}
        generatePatternPdf(data.patternImageURL, null);
    });

    card.querySelector('.png-download-btn').addEventListener('click', async () => {
        const safeName = (data.title || data.name || 'pattern').replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
        const dl = url => {
            const a = document.createElement('a');
            a.href = url; a.download = `${safeName}.png`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        };
        if (data.patternBase64) { dl(data.patternBase64); return; }
        if (data.patternStoragePath) {
            try { const blob = await getBlob(ref(storage, data.patternStoragePath)); const u = URL.createObjectURL(blob); dl(u); setTimeout(() => URL.revokeObjectURL(u), 1000); return; } catch {}
        }
        try {
            const res = await fetch(data.patternImageURL); if (!res.ok) throw new Error();
            const blob = await res.blob(); const u = URL.createObjectURL(blob); dl(u); setTimeout(() => URL.revokeObjectURL(u), 1000);
        } catch { window.open(data.patternImageURL, '_blank'); }
    });

    card.querySelector('.rename-btn').addEventListener('click', async () => {
        const current = data.title || data.name || '';
        const newName = window.prompt(tr('rename_prompt'), current);
        if (!newName || newName.trim() === current) return;
        const trimmed = newName.trim();
        try {
            await updateDoc(doc(db, `users/${uid}/patterns/${patternId}`), { title: trimmed, name: trimmed });
            card.querySelector('.pattern-card-name').textContent = trimmed;
            data.title = trimmed; data.name = trimmed;
        } catch (e) { console.error('Rename failed:', e); }
    });

    card.querySelector('.delete-btn').addEventListener('click', async () => {
        if (!window.confirm(tr('confirm_delete'))) return;
        try {
            await Promise.allSettled([
                deleteObject(ref(storage, `users/${uid}/patterns/${patternId}/pattern.png`)),
                deleteObject(ref(storage, `users/${uid}/patterns/${patternId}/original.jpg`))
            ]);
            await deleteDoc(doc(db, `users/${uid}/patterns/${patternId}`));
            card.remove();
            const gridEl = document.getElementById('patternGrid');
            if (gridEl && gridEl.children.length === 0) document.getElementById('patternsEmpty').style.display = 'block';
            // 사이드바 통계 갱신
            const statEl = document.getElementById('mpStatPatterns');
            if (statEl && !isNaN(+statEl.textContent)) statEl.textContent = Math.max(0, +statEl.textContent - 1);
        } catch (e) { console.error('Delete failed:', e); }
    });

    return card;
}

// ── 내 프로젝트 ───────────────────────────────────────────────────────────────

async function loadProjects(uid) {
    // localStorage 우선, 로그인 시 Firestore도 확인
    let counters = [];
    try {
        const local = localStorage.getItem('ssuessue_row_counters');
        if (local) counters = JSON.parse(local);
    } catch {}

    // Firestore 데이터 병합 (더 최신인 것 사용)
    if (uid) {
        try {
            const snap = await getDoc(doc(db, 'users', uid, 'rowCounters', 'main'));
            if (snap.exists()) {
                const fsData = snap.data();
                if (Array.isArray(fsData.counters) && fsData.counters.length) {
                    const fsTime = fsData.updatedAt || 0;
                    try {
                        const lsRaw = localStorage.getItem('ssuessue_row_counters');
                        const lsArr = lsRaw ? JSON.parse(lsRaw) : [];
                        // 어느 쪽이 더 최신인지 id의 timestamp로 비교는 어려우므로 Firestore를 우선
                        if (fsData.counters.length >= lsArr.length) counters = fsData.counters;
                    } catch { counters = fsData.counters; }
                }
            }
        } catch {}
    }

    const activeEl = document.getElementById('projectsActive');
    const doneEl   = document.getElementById('projectsDone');
    const doneWrap = document.getElementById('projectsDoneWrap');
    const emptyEl  = document.getElementById('projectsEmpty');
    const titleDone = document.getElementById('titleDoneProjects');
    if (titleDone) titleDone.textContent = tr('done_projects');

    activeEl.innerHTML = '';
    doneEl.innerHTML   = '';

    const active = counters.filter(c => !(c.goalRows > 0 && c.count >= c.goalRows));
    const done   = counters.filter(c =>   c.goalRows > 0 && c.count >= c.goalRows);

    if (active.length === 0 && done.length === 0) {
        emptyEl.style.display = 'block';
        return;
    }
    emptyEl.style.display = 'none';

    active.forEach(c => activeEl.appendChild(buildProjectCard(c)));
    if (done.length > 0) {
        doneWrap.style.display = '';
        done.forEach(c => doneEl.appendChild(buildProjectCard(c, true)));
    }
}

function buildProjectCard(c, isDone = false) {
    const card = document.createElement('div');
    card.className = 'mp-project-card' + (isDone ? ' mp-project-done' : '');

    const pct = c.goalRows > 0 ? Math.min(100, Math.round(c.count / c.goalRows * 100)) : null;
    const name = escHtml(c.name || ('Project #' + c.id));
    const rowLabel = tr('row_label');
    const goalStr  = c.goalRows > 0
        ? `${c.count} / ${c.goalRows} ${rowLabel}`
        : `${c.count} ${rowLabel} · ${tr('no_goal')}`;

    const progressHtml = pct !== null ? `
        <div class="mp-progress-bar-wrap">
            <div class="mp-progress-bar" style="width:${pct}%"></div>
        </div>
        <span class="mp-progress-pct">${pct}${tr('progress_done')}</span>
    ` : '';

    card.innerHTML = `
        <div class="mp-project-header">
            <span class="mp-project-name">${name}</span>
            ${isDone ? `<span class="mp-project-badge">${escHtml(tr('done_badge'))}</span>` : ''}
        </div>
        <div class="mp-project-meta">${escHtml(goalStr)}</div>
        ${progressHtml}
        <div class="mp-project-actions">
            <button class="secondary-btn small-btn mp-open-counter-btn">${escHtml(tr('open_counter'))}</button>
        </div>
    `;

    card.querySelector('.mp-open-counter-btn').addEventListener('click', () => {
        const rc = document.querySelector('knitting-row-counter');
        if (rc) rc.toggleDrawer();
    });

    return card;
}

// ── 내 글 ─────────────────────────────────────────────────────────────────────

async function loadMyPosts(uid) {
    const loadingEl = document.getElementById('myPostsLoading');
    const emptyEl   = document.getElementById('myPostsEmpty');
    const gridEl    = document.getElementById('myPostsGrid');
    loadingEl.style.display = 'block';
    emptyEl.style.display   = 'none';
    gridEl.innerHTML = '';

    try {
        const snap = await getDocs(query(collection(db, 'posts'), where('uid', '==', uid)));
        loadingEl.style.display = 'none';
        if (snap.empty) { emptyEl.style.display = 'block'; return; }

        const sorted = snap.docs.sort((a, b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0));
        sorted.forEach(ds => gridEl.appendChild(buildPostCard(ds.id, ds.data())));
    } catch (e) {
        loadingEl.style.display = 'none';
        emptyEl.textContent = `오류: ${e.message}`;
        emptyEl.style.display = 'block';
    }
}

// ── 내 댓글 ───────────────────────────────────────────────────────────────────

async function loadMyComments(uid) {
    const loadingEl = document.getElementById('myCommentsLoading');
    const emptyEl   = document.getElementById('myCommentsEmpty');
    const listEl    = document.getElementById('myCommentsList');
    loadingEl.style.display = 'block';
    emptyEl.style.display   = 'none';
    listEl.innerHTML = '';

    try {
        const q = query(
            collectionGroup(db, 'comments'),
            where('uid', '==', uid),
            orderBy('createdAt', 'desc'),
            limit(30)
        );
        const snap = await getDocs(q);
        loadingEl.style.display = 'none';
        if (snap.empty) { emptyEl.style.display = 'block'; return; }

        snap.forEach(ds => {
            const data = ds.data();
            // 경로: posts/{postId}/comments/{commentId}
            const postId = ds.ref.parent.parent?.id;
            const date = data.createdAt
                ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('ko-KR')
                : '';
            const item = document.createElement('a');
            item.className = 'mp-comment-item';
            item.href = postId ? `/post.html?id=${postId}` : '#';
            const contentEl = document.createElement('p');
            contentEl.className = 'mp-comment-content';
            contentEl.textContent = data.content || '';
            const metaEl = document.createElement('span');
            metaEl.className = 'mp-comment-meta';
            metaEl.textContent = date;
            item.appendChild(contentEl);
            item.appendChild(metaEl);
            listEl.appendChild(item);
        });
    } catch (e) {
        loadingEl.style.display = 'none';
        if (e.code === 'failed-precondition') {
            emptyEl.textContent = '댓글 목록 기능은 준비 중입니다.';
        } else {
            emptyEl.textContent = `오류: ${e.message}`;
        }
        emptyEl.style.display = 'block';
    }
}

// ── 스크랩 ────────────────────────────────────────────────────────────────────

async function loadScraps(uid) {
    const loadingEl = document.getElementById('scrapsLoading');
    const emptyEl   = document.getElementById('scrapsEmpty');
    const gridEl    = document.getElementById('scrapsGrid');
    loadingEl.style.display = 'block';
    emptyEl.style.display   = 'none';
    gridEl.innerHTML = '';

    try {
        const scrapsSnap = await getDocs(
            query(collection(db, `users/${uid}/scraps`), orderBy('scrappedAt', 'desc'), limit(50))
        );
        if (scrapsSnap.empty) {
            loadingEl.style.display = 'none';
            emptyEl.style.display   = 'block';
            return;
        }
        const postDocs = await Promise.all(
            scrapsSnap.docs.map(s => getDoc(doc(db, 'posts', s.id)))
        );
        loadingEl.style.display = 'none';
        let count = 0;
        scrapsSnap.docs.forEach((scrapDoc, i) => {
            const postDoc = postDocs[i];
            if (!postDoc.exists()) return;
            const card = buildPostCard(postDoc.id, postDoc.data(), { showUnscrap: true, uid, scrapId: scrapDoc.id });
            gridEl.appendChild(card);
            count++;
        });
        if (count === 0) emptyEl.style.display = 'block';
    } catch (e) {
        loadingEl.textContent = '불러오기 실패.';
        console.error(e);
    }
}

// ── 내 팔레트 ─────────────────────────────────────────────────────────────────

async function loadPalettes(uid) {
    const loadingEl = document.getElementById('palettesLoading');
    const emptyEl   = document.getElementById('palettesEmpty');
    const gridEl    = document.getElementById('palettesGrid');
    if (!loadingEl || !gridEl) return;
    loadingEl.style.display = 'block';
    emptyEl.style.display   = 'none';
    gridEl.innerHTML = '';

    // 비로그인: localStorage 팔레트
    if (!uid) {
        try {
            const local = JSON.parse(localStorage.getItem('ssuessue_palettes') || '[]');
            loadingEl.style.display = 'none';
            if (!local.length) { emptyEl.style.display = 'block'; return; }
            local.forEach(p => gridEl.appendChild(buildPaletteCard(null, p.id, p)));
        } catch { emptyEl.style.display = 'block'; }
        return;
    }

    try {
        const snap = await getDocs(query(
            collection(db, `users/${uid}/palettes`),
            orderBy('createdAt', 'desc'), limit(100)
        ));
        loadingEl.style.display = 'none';
        if (snap.empty) { emptyEl.style.display = 'block'; return; }
        snap.forEach(ds => gridEl.appendChild(buildPaletteCard(uid, ds.id, ds.data())));
    } catch (e) {
        loadingEl.textContent = '불러오기 실패.';
        console.error(e);
    }
}

function buildPaletteCard(uid, paletteId, data) {
    const card = document.createElement('div');
    card.className = 'cp-palette-card mp-palette-card';

    const date = data.createdAt
        ? (typeof data.createdAt.seconds === 'number'
            ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('ko-KR')
            : new Date(data.createdAt).toLocaleDateString('ko-KR'))
        : '';
    const colors = Array.isArray(data.colors) ? data.colors : [];
    const swatches = colors.map(c =>
        `<span class="cp-palette-swatch" style="background:${escHtml(c)};width:28px;height:28px;border-radius:4px;display:inline-block;"></span>`
    ).join('');

    card.innerHTML = `
        <div class="cp-palette-swatches" style="display:flex;gap:4px;margin-bottom:0.6rem;">${swatches}</div>
        <p class="cp-palette-name" style="font-size:0.9rem;font-weight:600;margin:0 0 0.25rem;">${escHtml(data.name || '팔레트')}</p>
        <p style="font-size:0.75rem;color:#aaa;margin:0 0 0.75rem;">${date}</p>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
            <a href="/color-palette.html?palette=${encodeURIComponent(JSON.stringify(colors))}" class="secondary-btn small-btn">${escHtml(tr('palette_open'))}</a>
            <button class="secondary-btn small-btn mp-palette-rename-btn">${escHtml(tr('palette_rename'))}</button>
            <button class="secondary-btn small-btn mp-palette-delete-btn">${escHtml(tr('palette_delete'))}</button>
        </div>
    `;

    card.querySelector('.mp-palette-rename-btn').addEventListener('click', async () => {
        const newName = window.prompt(tr('palette_rename_prompt'), data.name || '');
        if (!newName || newName.trim() === data.name) return;
        const trimmed = newName.trim();
        try {
            if (uid) {
                await updateDoc(doc(db, `users/${uid}/palettes/${paletteId}`), { name: trimmed });
            } else {
                const existing = JSON.parse(localStorage.getItem('ssuessue_palettes') || '[]');
                const idx = existing.findIndex(p => p.id === paletteId);
                if (idx !== -1) { existing[idx].name = trimmed; localStorage.setItem('ssuessue_palettes', JSON.stringify(existing)); }
            }
            card.querySelector('.cp-palette-name').textContent = trimmed;
            data.name = trimmed;
        } catch (e) { console.error(e); }
    });

    card.querySelector('.mp-palette-delete-btn').addEventListener('click', async () => {
        if (!window.confirm(tr('confirm_delete_palette'))) return;
        try {
            if (uid) {
                await deleteDoc(doc(db, `users/${uid}/palettes/${paletteId}`));
            } else {
                const existing = JSON.parse(localStorage.getItem('ssuessue_palettes') || '[]');
                localStorage.setItem('ssuessue_palettes', JSON.stringify(existing.filter(p => p.id !== paletteId)));
            }
            card.remove();
            const gridEl = document.getElementById('palettesGrid');
            if (gridEl && gridEl.children.length === 0) document.getElementById('palettesEmpty').style.display = 'block';
        } catch (e) { console.error(e); }
    });

    return card;
}

// ── 게시글 카드 ───────────────────────────────────────────────────────────────

function buildPostCard(postId, data, opts = {}) {
    const card = document.createElement('a');
    card.className = 'post-card';
    card.href = `/post.html?id=${postId}`;

    const date = data.createdAt
        ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('ko-KR')
        : '';
    const thumb = data.images?.[0]
        ? `<div class="post-card-thumb" style="background-image:url(${escHtml(data.images[0])})"></div>`
        : '<div class="post-card-thumb post-card-thumb-empty"></div>';
    const tagsHtml = (data.tags || []).slice(0, 3).map(t => `<span class="post-card-tag">${escHtml(t)}</span>`).join('');
    const avatarStyle = data.profilePhotoURL ? `style="background-image:url(${escHtml(data.profilePhotoURL)})"` : '';
    const avatarInner = data.profilePhotoURL ? '' : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';

    card.innerHTML = `
        ${thumb}
        <div class="post-card-body">
          <div class="post-card-tags">${tagsHtml}</div>
          <p class="post-card-title">${escHtml(data.title || '')}</p>
          <div class="post-card-meta">
            <span class="post-card-avatar-sm" ${avatarStyle}>${avatarInner}</span>
            <span>${escHtml(data.nickname || '')}</span>
            <span class="post-card-date"> · ${date}</span>
            <span class="post-card-counts"> · ♥ ${data.likeCount || 0}</span>
          </div>
        </div>
    `;

    if (opts.showUnscrap) {
        const unscrapBtn = document.createElement('button');
        unscrapBtn.className = 'mp-unscrap-btn';
        unscrapBtn.textContent = tr('unscrap');
        unscrapBtn.addEventListener('click', async e => {
            e.preventDefault();
            if (!window.confirm(tr('confirm_unscrap'))) return;
            try {
                await deleteDoc(doc(db, `users/${opts.uid}/scraps/${opts.scrapId}`));
                card.remove();
                const gridEl = document.getElementById('scrapsGrid');
                if (gridEl && gridEl.children.length === 0) {
                    document.getElementById('scrapsEmpty').style.display = 'block';
                }
                const statEl = document.getElementById('mpStatScraps');
                if (statEl && !isNaN(+statEl.textContent)) statEl.textContent = Math.max(0, +statEl.textContent - 1);
            } catch (err) { console.error(err); }
        });
        card.querySelector('.post-card-body').appendChild(unscrapBtn);
    }

    return card;
}

// ── 회원 탈퇴 ─────────────────────────────────────────────────────────────────

(function initWithdrawal() {
    const btn     = document.getElementById('withdrawalBtn');
    const modal   = document.getElementById('withdrawalModal');
    const cancelBtn  = document.getElementById('withdrawalCancelBtn');
    const confirmBtn = document.getElementById('withdrawalConfirmBtn');
    const input   = document.getElementById('withdrawalConfirmInput');
    const errorEl = document.getElementById('withdrawalError');
    if (!btn || !modal) return;

    btn.addEventListener('click', () => { input.value = ''; errorEl.style.display = 'none'; modal.style.display = 'flex'; });
    cancelBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

    confirmBtn.addEventListener('click', async () => {
        if (input.value.trim() !== '탈퇴합니다') {
            errorEl.textContent = '탈퇴합니다 를 정확히 입력해주세요.';
            errorEl.style.display = 'block';
            return;
        }
        const user = auth.currentUser;
        if (!user) return;
        confirmBtn.disabled = true;
        confirmBtn.textContent = '처리 중...';
        errorEl.style.display = 'none';
        try {
            await deleteUserAccount(user);
            modal.style.display = 'none';
            window.location.href = '/';
        } catch (e) {
            errorEl.textContent = e.code === 'auth/requires-recent-login'
                ? '보안을 위해 재로그인 후 다시 시도해주세요.'
                : '탈퇴 처리 중 오류가 발생했습니다: ' + e.message;
            errorEl.style.display = 'block';
            confirmBtn.disabled = false;
            confirmBtn.textContent = '탈퇴하기';
        }
    });
})();

// ── Auth 초기화 ───────────────────────────────────────────────────────────────

initAuth();
document.getElementById('gotoSignInBtn')?.addEventListener('click', openAuthModal);

onAuthStateChanged(auth, async user => {
    if (urlUid) {
        // 타인 프로필 모드 — 로그인 여부와 무관하게 표시
        currentUid = urlUid;
        viewMode   = user && user.uid === urlUid ? 'mine' : 'other';
        document.getElementById('notLoggedIn').style.display = 'none';
        document.getElementById('loggedIn').style.display    = '';
        if (!panelLoaded['_sidebar']) {
            panelLoaded['_sidebar'] = true;
            await fillSidebar(urlUid, /* readOnly */ true);
            setupOtherUserView();
        }
    } else if (user) {
        currentUid = user.uid;
        viewMode   = 'mine';
        document.getElementById('notLoggedIn').style.display = 'none';
        document.getElementById('loggedIn').style.display    = '';
        if (!panelLoaded['_sidebar']) {
            panelLoaded['_sidebar'] = true;
            await fillSidebar(user.uid);
            switchPanel(currentPanel);
        }
    } else {
        currentUid = null;
        document.getElementById('notLoggedIn').style.display = '';
        document.getElementById('loggedIn').style.display    = 'none';
        // 비로그인이지만 타인 프로필이 없으면 로그인 유도
        if (!urlUid) openAuthModal();
    }
});

function setupOtherUserView() {
    // 도안은 본인 전용 — 타인 프로필에서 탭 자체를 숨김
    // 프로필 편집 / 내 프로젝트 / 스크랩 탭도 숨김
    ['mpNavPatterns', 'mpNavProfile', 'mpNavProjects', 'mpNavScraps', 'mpNavPalettes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    // 내 댓글 서브탭도 불필요
    const commentTab = document.getElementById('subtabComments');
    if (commentTab) commentTab.style.display = 'none';

    switchPanel(currentPanel); // 'posts'
}
