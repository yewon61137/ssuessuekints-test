// mypage.js — 마이페이지 v2 (사이드바 5탭 레이아웃)

import { auth, db, initAuth, openAuthModal, getUserProfile, updateUserProfile, checkNicknameAvailable, deleteUserAccount, followUser, unfollowUser, isFollowing } from './auth.js';
import { t as sharedT, initLang } from './i18n.js';
import { onAuthStateChanged } from './firebase-auth.js';
import {
    collection, collectionGroup, query, orderBy, limit, getDocs,
    doc, getDoc, deleteDoc, updateDoc, where, onSnapshot, addDoc, serverTimestamp
} from './firebase-db.js';
import { ref, deleteObject, uploadBytes, getDownloadURL } from './firebase-storage.js';
// getBlob is not used in the truncated part, checking if it is used later.

// ── i18n ──────────────────────────────────────────────────────────────────────

const pageT = {
    ko: {
        tab_profile: '프로필', tab_patterns: '내 도안함',
        tab_projects: '내 프로젝트', tab_posts: '내 글·댓글', tab_scraps: '스크랩',
        subtab_posts: '내 글', subtab_comments: '내 댓글',
        not_logged_in: '로그인하면 마이페이지를 이용할 수 있습니다.',
        go_to_signin: '로그인', loading: '불러오는 중...',
        public_projects: '공개 프로젝트',
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
        login_to_save_palette: '팔레트를 저장하려면 로그인이 필요해요.',
        tab_public_palettes: '공개 팔레트', title_public_palettes: '공개 팔레트',
        empty_public_palettes: '공개된 팔레트가 없어요.',
        palette_public: '공개', palette_private: '비공개',
        palette_make_public: '공개로 전환', palette_make_private: '비공개로 전환',
        tab_other_posts: '게시글', user_not_found: '존재하지 않는 사용자예요.',
        bio_more: '더 보기', bio_less: '접기',
        tab_stash: '내 실 창고', title_stash: '내 실 창고',
        empty_stash: '창고에 등록된 실이 없어요.',
        yarn_new: '실 등록', yarn_modal_title: '실 정보 등록',
        yarn_label_brand: '브랜드', yarn_label_name: '실 이름', yarn_label_color: '색상/로트',
        yarn_label_quantity: '보유량 (볼/타래)', yarn_label_weight: '무게 (g)',
        yarn_label_needle: '추천 바늘', yarn_label_notes: '메모',
        yarn_delete_confirm: '이 실을 삭제하시겠습니까?',
        yarn_upload_error: '사진 업로드 중 오류가 발생했습니다.',
        confirm_delete_project: '이 프로젝트를 삭제하시겠습니까?',
    },
    en: {
        tab_profile: 'Profile', tab_patterns: 'My Patterns',
        tab_projects: 'Projects', tab_posts: 'Posts & Comments', tab_scraps: 'Scraps',
        subtab_posts: 'Posts', subtab_comments: 'Comments',
        not_logged_in: 'Sign in to access your page.',
        go_to_signin: 'Sign In', loading: 'Loading...',
        public_projects: 'Public Projects',
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
        login_to_save_palette: 'Please sign in to save palettes.',
        tab_public_palettes: 'Public Palettes', title_public_palettes: 'Public Palettes',
        empty_public_palettes: 'No public palettes yet.',
        palette_public: 'Public', palette_private: 'Private',
        palette_make_public: 'Make Public', palette_make_private: 'Make Private',
        tab_other_posts: 'Posts', user_not_found: 'This user does not exist.',
        bio_more: 'More', bio_less: 'Less',
        tab_stash: 'My Yarn Stash', title_stash: 'My Yarn Stash',
        empty_stash: 'No yarns in your stash.',
        yarn_new: 'Add Yarn', yarn_modal_title: 'Register Yarn Info',
        yarn_label_brand: 'Brand', yarn_label_name: 'Yarn Name', yarn_label_color: 'Color/Lot',
        yarn_label_quantity: 'Quantity (Balls)', yarn_label_weight: 'Weight (g)',
        yarn_label_needle: 'Recommended Needle', yarn_label_notes: 'Notes',
        yarn_delete_confirm: 'Delete this yarn?',
        yarn_upload_error: 'Error uploading photo.',
        confirm_delete_project: 'Delete this project?',
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
        login_to_save_palette: 'パレットを保存するにはログインが必要です。',
        tab_public_palettes: '公開パレット', title_public_palettes: '公開パレット',
        empty_public_palettes: '公開されたパレットがありません。',
        palette_public: '公開', palette_private: '非公開',
        palette_make_public: '公開にする', palette_make_private: '非公開にする',
        tab_other_posts: '投稿', user_not_found: 'このユーザーは存在しません。',
        public_projects: '公開プロジェクト',
        bio_more: 'もっと見る', bio_less: '閉じる',
        tab_stash: 'マイ毛糸倉庫', title_stash: 'マイ毛糸倉庫',
        empty_stash: '倉庫に登録された毛糸がありません。',
        yarn_new: '毛糸を登録', yarn_modal_title: '毛糸情報の登録',
        yarn_label_brand: 'ブランド', yarn_label_name: '毛糸名', yarn_label_color: '色/ロット',
        yarn_label_quantity: '保有量 (玉)', yarn_label_weight: '重さ (g)',
        yarn_label_needle: 'おすすめの針', yarn_label_notes: 'メモ',
        yarn_delete_confirm: 'この毛糸を削除しますか？',
        yarn_upload_error: '写真のアップロード中にエラーが発生しました。',
        confirm_delete_project: 'このプロジェクトを削除しますか？',
    }
};

let currentLang = localStorage.getItem('ssuessue_lang') || 'ko';
function tr(key) { return pageT[currentLang]?.[key] ?? sharedT[currentLang]?.[key] ?? key; }

// ── 상태 ─────────────────────────────────────────────────────────────────────

const urlUid   = new URLSearchParams(location.search).get('uid'); // 타인 프로필 모드
let   viewMode = urlUid ? 'other' : 'mine'; // 'mine' | 'other'
let currentUid = null;
let currentPanel = urlUid ? 'posts' : 'profile'; // 타인 프로필은 글 목록부터 (도안은 본인 전용)
const panelLoaded = {};
let stashUnsub = null;
let yarnPhotoFile = null;

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

    if (name === 'profile')          loadProfilePanel(currentUid);
    else if (name === 'patterns')        loadPatterns(currentUid);
    else if (name === 'projects')        loadProjects(currentUid);
    else if (name === 'posts')           loadMyPosts(currentUid);
    else if (name === 'scraps')          loadScraps(currentUid);
    else if (name === 'palettes')        loadPalettes(currentUid);
    else if (name === 'publicPalettes')  loadPublicPalettes(urlUid || currentUid);
    else if (name === 'publicProjects')  loadPublicProjects(urlUid || currentUid);
    else if (name === 'stash')           initStash(currentUid);
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

    // 자기소개
    const bioEl = document.getElementById('mpBio');
    const bioToggle = document.getElementById('mpBioToggle');
    if (bioToggle) bioToggle.remove(); // reset
    if (bioEl) {
        const bioText = profile.bio || '';
        if (bioText) {
            bioEl.textContent = bioText;
            bioEl.classList.remove('expanded');
            bioEl.style.display = '';
            // "더 보기" toggle — only if text overflows 3 lines
            requestAnimationFrame(() => {
                if (bioEl.scrollHeight > bioEl.clientHeight + 2) {
                    const toggle = document.createElement('button');
                    toggle.id = 'mpBioToggle';
                    toggle.className = 'mp-bio-toggle';
                    toggle.textContent = tr('bio_more') || '더 보기';
                    toggle.addEventListener('click', () => {
                        const expanded = bioEl.classList.toggle('expanded');
                        toggle.textContent = expanded ? (tr('bio_less') || '접기') : (tr('bio_more') || '더 보기');
                    });
                    bioEl.insertAdjacentElement('afterend', toggle);
                }
            });
        } else {
            bioEl.style.display = 'none';
        }
    }

    // 도안 수, 스크랩 수는 본인 전용 — 타인 프로필에서는 숨기고 받은 좋아요 + 공개 팔레트 표시
    const followingWrap = document.getElementById('mpStatFollowingWrap');
    if (readOnly) {
        document.getElementById('mpStatPatterns')?.closest('.mp-stat')?.style.setProperty('display', 'none');
        document.getElementById('mpStatScraps')?.closest('.mp-stat')?.style.setProperty('display', 'none');
        document.getElementById('mpStatLikesWrap')?.style.setProperty('display', '');
        document.getElementById('mpStatPublicPalettesWrap')?.style.setProperty('display', '');
        if (followingWrap) followingWrap.classList.remove('clickable-stat');
        if (followingWrap) followingWrap.onclick = null;
    } else {
        if (followingWrap) {
            followingWrap.classList.add('clickable-stat');
            followingWrap.onclick = () => {
                document.getElementById('followingModal').style.display = 'flex';
                loadFollowing(uid);
            };
        }
    }

    // 통계 (병렬)
    const statsQueries = [
        getDocs(query(collection(db, 'posts'), where('uid', '==', uid))),
        getDocs(query(collection(db, 'follows'), where('followerId', '==', uid))),
        getDocs(query(collection(db, 'follows'), where('followingId', '==', uid)))
    ];
    if (!readOnly) {
        statsQueries.push(getDocs(query(collection(db, `users/${uid}/patterns`), limit(500))));
        statsQueries.push(getDocs(query(collection(db, `users/${uid}/scraps`), limit(500))));
    } else {
        statsQueries.push(getDocs(query(collection(db, `users/${uid}/palettes`), where('isPublic', '==', true), limit(500))));
    }

    Promise.all(statsQueries).then((results) => {
        const posts = results[0];
        const following = results[1];
        const followers = results[2];

        const poEl = document.getElementById('mpStatPosts');
        if (poEl) poEl.textContent = posts.size;

        const fgEl = document.getElementById('mpStatFollowing');
        if (fgEl) fgEl.textContent = following.size;

        const fwEl = document.getElementById('mpStatFollowers');
        if (fwEl) fwEl.textContent = followers.size;

        if (readOnly) {
            const publicPalettes = results[3];
            let totalLikes = 0;
            posts.forEach(ds => { totalLikes += ds.data().likeCount || 0; });
            const likesEl = document.getElementById('mpStatLikes');
            if (likesEl) likesEl.textContent = totalLikes;
            const ppEl = document.getElementById('mpStatPublicPalettes');
            if (ppEl) ppEl.textContent = publicPalettes?.size ?? 0;
        } else {
            const patterns = results[3];
            const scraps = results[4];
            const pEl  = document.getElementById('mpStatPatterns');
            const scEl = document.getElementById('mpStatScraps');
            if (pEl)  pEl.textContent  = patterns.size;
            if (scEl) scEl.textContent = scraps?.size ?? '—';
        }
    }).catch((e) => { console.error('Stats loading failed', e); });
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

    photoInput?.addEventListener('change', async () => {
        const file = photoInput.files[0];
        if (!file) return;

        const { validateFile } = await import('./auth.js');
        const v = validateFile(file);
        if (!v.valid) {
            alert(v.error);
            photoInput.value = '';
            return;
        }

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

    const isFilet = data.type === 'filet';
    const filetMeta = isFilet ? `${data.gridCols || data.gridW || 0} × ${data.gridRows || data.gridH || 0} | ${data.resultSizeText || ''}` : '';

    card.innerHTML = `
        <img class="pattern-card-thumb" src="${data.patternImageURL}" alt="${displayName}" loading="lazy" onerror="this.style.background='#eee'">
        <div class="pattern-card-body">
          <p class="pattern-card-name" title="${displayName}">${displayName}</p>
          <p class="pattern-card-meta">${isFilet ? filetMeta : `${data.stitches}${tr('stitches')} × ${data.rows}${tr('rows')}${settingsText ? ' · ' + settingsText : ''}`}</p>
          <p class="pattern-card-meta" style="color:#aaa;">${date}</p>
          <div class="pattern-card-actions">
            <button class="rename-btn">${tr('rename')}</button>
            ${isFilet ? '' : `<a href="${data.originalImageURL}" target="_blank" rel="noopener">${tr('view_original')}</a>`}
            <button class="pdf-btn">PDF</button>
            <button class="delete-btn">${tr('delete')}</button>
          </div>
        </div>
    `;

    card.querySelector('.pattern-card-thumb').addEventListener('click', () => window.open(data.patternImageURL, '_blank'));

    function generateFiletPdf() {
        if (typeof window.jspdf === 'undefined') {
            alert('PDF 라이브러리를 불러오지 못했습니다.');
            return;
        }
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const margin = 20;
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = pdf.internal.pageSize.getHeight();

        // 고해상도 텍스트 렌더링 함수 (High-DPI)
        const textToImg = (text, size, isBold = false) => {
            const scale = 4; // 4배 고해상도
            const tCanvas = document.createElement('canvas');
            const tCtx = tCanvas.getContext('2d');
            tCtx.font = `${isBold ? 'bold ' : ''}${size * scale}px sans-serif`;
            const m = tCtx.measureText(text);
            tCanvas.width = Math.ceil(m.width) + (20 * scale);
            tCanvas.height = size * 8 * scale;
            tCtx.font = `${isBold ? 'bold ' : ''}${size * scale}px sans-serif`;
            tCtx.fillStyle = '#000'; tCtx.textBaseline = 'middle';
            tCtx.fillText(text, 10 * scale, tCanvas.height / 2);
            return { src: tCanvas.toDataURL('image/png'), w: tCanvas.width / (scale * 2.5), h: tCanvas.height / (scale * 2.5) };
        };

        const title = textToImg(data.title || data.name || '방안뜨기 도안', 18, true);
        pdf.addImage(title.src, 'PNG', margin, margin - 10, title.w, title.h);

        const summary = textToImg(`그리드: ${data.gridCols || data.gridW || 0} x ${data.gridRows || data.gridH || 0} | ${data.resultSizeText || ''}`, 10);
        pdf.addImage(summary.src, 'PNG', margin, margin + 5, summary.w, summary.h);

        const legend = textToImg('범례: ■ 채움(한길긴뜨기 묶음), □ 비움(방안)', 10);
        pdf.addImage(legend.src, 'PNG', margin, margin + 12, legend.w, legend.h);

        const startChainValue = (data.gridCols || data.gridW || 0) * 3 + 1;
        const startChain = textToImg(`시작코: ${startChainValue} 코`, 10);
        pdf.addImage(startChain.src, 'PNG', margin, margin + 19, startChain.w, startChain.h);

        const chartAreaW = pdfW - margin * 2;
        const chartAreaH = pdfH - margin * 2 - 30;
        const gw = data.gridCols || data.gridW || 0, gh = data.gridRows || data.gridH || 0;
        
        // 1D 데이터를 2D로 복원
        const flatData = data.gridData || [];
        const reconstructedGrid = [];
        for (let i = 0; i < gh; i++) {
            reconstructedGrid.push(flatData.slice(i * gw, (i + 1) * gw));
        }

        let pdfCellSize = Math.min(chartAreaW / gw, chartAreaH / gh);
        const startX = margin, startY = margin + 30;

        for (let y = 0; y < gh; y++) {
            for (let x = 0; x < gw; x++) {
                const val = reconstructedGrid[y][x];
                const px = startX + x * pdfCellSize;
                const py = startY + y * pdfCellSize;
                if (val === 1) {
                    pdf.setFillColor(0);
                    pdf.rect(px, py, pdfCellSize, pdfCellSize, 'F');
                } else if (val === 0) {
                    pdf.setDrawColor(220);
                    pdf.rect(px, py, pdfCellSize, pdfCellSize, 'S');
                }
            }
        }
        pdf.save(`${(data.title || data.name || 'filet').replace(/\s+/g, '_')}.pdf`);
    }

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
            const scale = 4;
            titleCanvas.width = 1200 * scale; titleCanvas.height = 60 * scale;
            const tCtx = titleCanvas.getContext('2d');
            tCtx.font = `600 ${32 * scale}px sans-serif`; tCtx.fillStyle = '#000000';
            tCtx.fillText(data.title || data.name || 'Pattern', 20 * scale, 45 * scale);
            pdf.addImage(titleCanvas.toDataURL('image/png'), 'PNG', margin, margin, maxW, maxW * 60 / 1200);

            pdf.setFontSize(10);
            const sizeStr = data.widthCm ? (data.heightCm ? `${data.widthCm}cm x ${data.heightCm}cm` : `${data.widthCm}cm`) : '';
            const infoLine = `${data.stitches || 0} Stitches x ${data.rows || 0} Rows`
                + (sizeStr ? ` (${sizeStr})` : '')
                + (data.yarnType ? ` · ${data.yarnType}` : (data.yarnMm ? ` · ${data.yarnMm}mm` : ''));
            pdf.text(infoLine, margin, margin + 14);

            const tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = img.width; tmpCanvas.height = img.height;
            const tmpCtx = tmpCanvas.getContext('2d');
            tmpCtx.imageSmoothingEnabled = false; // 픽셀 선명도 유지
            tmpCtx.drawImage(img, 0, 0);
            pdf.addImage(tmpCanvas.toDataURL('image/png'), 'PNG', margin, margin + 22, finalW, finalH);

            if (data.legendHTML) {
                pdf.addPage();
                pdf.setFontSize(12); pdf.text('Color Legend', margin, margin + 5);
                const parsedDoc = new DOMParser().parseFromString(data.legendHTML, 'text/html');
                let y = margin + 15;
                parsedDoc.querySelectorAll('.color-item').forEach(item => {
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
        if (isFilet) { generateFiletPdf(); return; }
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
    const activeEl  = document.getElementById('projectsActive');
    const doneEl    = document.getElementById('projectsDone');
    const doneWrap  = document.getElementById('projectsDoneWrap');
    const emptyEl   = document.getElementById('projectsEmpty');
    const titleDone = document.getElementById('titleDoneProjects');
    if (titleDone) titleDone.textContent = tr('done_projects');
    if (!activeEl) return;

    activeEl.innerHTML = '';
    doneEl.innerHTML   = '';

    try {
        const projSnap = await getDocs(
            query(collection(db, 'users', uid, 'projects'), orderBy('createdAt', 'desc'))
        );

        const projects = await Promise.all(projSnap.docs.map(async d => {
            const proj = { id: d.id, ...d.data() };
            try {
                const partsSnap = await getDocs(
                    collection(db, 'users', uid, 'projects', d.id, 'parts')
                );
                const parts = partsSnap.docs.map(pd => pd.data());
                proj._parts     = parts;
                proj._done      = parts.filter(p => p.status === 'done').length;
                proj._total     = parts.length;
                proj._pct       = parts.length > 0 ? Math.round(proj._done / proj._total * 100) : 0;
                if (parts.length > 0 && parts.every(p => p.status === 'done')) proj._status = 'done';
                else if (parts.some(p => p.status === 'inProgress'))             proj._status = 'inProgress';
                else                                                               proj._status = 'pending';
            } catch {
                proj._parts = []; proj._done = 0; proj._total = 0; proj._pct = 0; proj._status = 'pending';
            }
            return proj;
        }));

        const active = projects.filter(p => p._status !== 'done');
        const done   = projects.filter(p => p._status === 'done');

        if (active.length === 0 && done.length === 0) {
            emptyEl.style.display = 'block';
            return;
        }
        emptyEl.style.display = 'none';

        active.forEach(p => activeEl.appendChild(buildProjectCard(uid, p, false)));
        if (done.length > 0) {
            doneWrap.style.display = '';
            done.forEach(p => doneEl.appendChild(buildProjectCard(uid, p, true)));
        }
    } catch (e) {
        console.error('loadProjects error:', e);
        emptyEl.style.display = 'block';
    }
}

function buildProjectCard(uid, proj, isDone = false, readOnly = false) {
    const card = document.createElement('div');
    card.className = 'mp-project-card' + (isDone ? ' mp-project-done' : '');
    card.style.cursor = 'pointer';
    const projUrl = `/projects.html?uid=${uid}&id=${encodeURIComponent(proj.id)}`;
    card.addEventListener('click', (e) => {
        if (e.target.closest('.mp-proj-public-toggle') || e.target.closest('.mp-proj-delete-btn')) return;
        location.href = projUrl;
    });

    const statusLabel = proj._status === 'done'     ? tr('done_badge')
                      : proj._status === 'inProgress' ? '진행중'
                      : '시작전';
    const pct = proj._pct ?? 0;
    const progressHtml = proj._total > 0 ? `
        <div class="mp-progress-bar-wrap">
            <div class="mp-progress-bar" style="width:${pct}%"></div>
        </div>
        <span class="mp-progress-pct">${proj._done} / ${proj._total}${tr('progress_done')}</span>` : '';

    const shareBtn = (!readOnly && isDone) ? `<button class="secondary-btn small-btn mp-share-proj-btn">${tr('go_community')}</button>` : '';
    const deleteBtn = !readOnly ? `<button class="secondary-btn small-btn mp-proj-delete-btn" style="border:1px solid var(--border); color:#ff5252;">${tr('delete')}</button>` : '';
    const toggleBtn = !readOnly ? `
            <button class="secondary-btn small-btn mp-proj-public-toggle" data-id="${escHtml(proj.id)}" data-public="${!!proj.isPublic}" style="border:1px solid var(--border); padding:6px 12px; background:var(--bg); transition:background 0.2s;">
                ${proj.isPublic ? `🔒 ${escHtml(tr('proj_private'))}로 전환` : `🔓 ${escHtml(tr('proj_public'))}로 전환`}
            </button>` : '';

    card.innerHTML = `
        <div class="mp-project-header">
            <span class="mp-project-name">${escHtml(proj.title || 'Project')}</span>
            ${isDone ? `<span class="mp-project-badge">${escHtml(statusLabel)}</span>` : ''}
            ${proj.isPublic ? `<span class="mp-project-badge" style="margin-left:auto; font-size:0.7em; background:#e0f7fa; color:#006064;">${escHtml(tr('proj_public'))}</span>` : ''}
        </div>
        ${proj.yarn   ? `<div class="mp-project-meta">🧶 ${escHtml(proj.yarn)}</div>` : ''}
        ${proj.needle ? `<div class="mp-project-meta">🪡 ${escHtml(proj.needle)}</div>` : ''}
        ${progressHtml}
        <div class="mp-project-actions" style="flex-wrap:wrap; gap:6px;">
            <button class="secondary-btn small-btn mp-open-proj-btn">자세히 보기 →</button>
            ${toggleBtn}
            ${deleteBtn}
            ${shareBtn}
        </div>`;

    card.querySelector('.mp-open-proj-btn').addEventListener('click', e => {
        e.stopPropagation();
        location.href = projUrl;
    });

    card.querySelector('.mp-share-proj-btn')?.addEventListener('click', e => {
        e.stopPropagation();
        location.href = '/community.html';
    });

    if (!readOnly) {
        card.querySelector('.mp-proj-public-toggle')?.addEventListener('click', async e => {
            e.stopPropagation();
            const pid = e.currentTarget.dataset.id;
            const isPub = e.currentTarget.dataset.public === 'true';
            try {
                await updateDoc(doc(db, 'users', currentUser.uid, 'projects', pid), { isPublic: !isPub });
                loadProjects(currentUser.uid);
            } catch(err) {
                alert('업데이트 실패: ' + err.message);
            }
        });

        card.querySelector('.mp-proj-delete-btn')?.addEventListener('click', async e => {
            e.stopPropagation();
            if (!confirm(tr('confirm_delete_project'))) return;
            const pid = proj.id;
            try {
                await deleteDoc(doc(db, 'users', currentUser.uid, 'projects', pid));
                loadProjects(currentUser.uid);
            } catch(err) {
                alert('삭제 실패: ' + err.message);
            }
        });
    }

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

    // 비로그인: 로그인 안내
    if (!uid) {
        loadingEl.style.display = 'none';
        const loginLabel = { ko: '로그인', en: 'Sign in', ja: 'ログイン' }[currentLang] || '로그인';
        emptyEl.innerHTML = `${tr('login_to_save_palette')} <button id="paletteLoginBtn" style="background:none;border:none;cursor:pointer;color:#000;font-weight:700;text-decoration:underline;">${loginLabel}</button>`;
        emptyEl.style.display = 'block';
        document.getElementById('paletteLoginBtn')?.addEventListener('click', openAuthModal);
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

// ── 공개 팔레트 (타인 프로필) ──────────────────────────────────────────────────

async function loadPublicPalettes(uid) {
    const loadingEl = document.getElementById('publicPalettesLoading');
    const emptyEl   = document.getElementById('publicPalettesEmpty');
    const gridEl    = document.getElementById('publicPalettesGrid');
    if (!loadingEl || !gridEl) return;
    loadingEl.style.display = 'block';
    emptyEl.style.display   = 'none';
    gridEl.innerHTML = '';

    try {
        const snap = await getDocs(query(
            collection(db, `users/${uid}/palettes`),
            where('isPublic', '==', true)
        ));
        loadingEl.style.display = 'none';
        if (snap.empty) {
            emptyEl.textContent = tr('empty_public_palettes');
            emptyEl.style.display = 'block';
            return;
        }
        const palettes = [];
        snap.forEach(ds => palettes.push({ id: ds.id, ...ds.data() }));
        palettes
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
            .forEach(p => gridEl.appendChild(buildPublicPaletteCard(p)));
    } catch (e) {
        loadingEl.style.display = 'none';
        emptyEl.textContent = tr('empty_public_palettes');
        emptyEl.style.display = 'block';
    }
}

// ── 공개 프로젝트 (타인 프로필) ──────────────────────────────────────────────────

async function loadPublicProjects(uid) {
    const loadingEl = document.getElementById('publicProjectsLoading');
    const emptyEl   = document.getElementById('publicProjectsEmpty');
    const gridEl    = document.getElementById('publicProjectsGrid');
    if (!loadingEl || !gridEl) return;
    loadingEl.style.display = 'block';
    emptyEl.style.display   = 'none';
    gridEl.innerHTML = '';
    gridEl.style.display = 'grid';
    gridEl.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
    gridEl.style.gap = '1.25rem';
    gridEl.style.marginTop = '1rem';

    try {
        const snap = await getDocs(query(
            collection(db, `users/${uid}/projects`),
            where('isPublic', '==', true)
        ));
        loadingEl.style.display = 'none';
        if (snap.empty) {
            emptyEl.textContent = tr('public_projects') + ' 없음'; // 임시
            emptyEl.style.display = 'block';
            return;
        }
        const projects = [];
        snap.forEach(ds => projects.push({ id: ds.id, ...ds.data() }));
        projects
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
            .forEach(p => {
                const isDone = p._status === 'done';
                gridEl.appendChild(buildProjectCard(uid, p, isDone, true)); // readOnly=true
            });
    } catch (e) {
        loadingEl.style.display = 'none';
        console.error(e);
        emptyEl.textContent = '불러오기 실패';
        emptyEl.style.display = 'block';
    }
}

function buildPublicPaletteCard(data) {
    const card = document.createElement('div');
    card.className = 'cp-palette-card';
    const colors = Array.isArray(data.colors) ? data.colors : [];
    const swatches = colors.map(c =>
        `<span style="background:${escHtml(c)};width:28px;height:28px;border-radius:4px;display:inline-block;"></span>`
    ).join('');
    const date = data.createdAt?.seconds
        ? new Date(data.createdAt.seconds * 1000).toLocaleDateString(
            currentLang === 'ko' ? 'ko-KR' : currentLang === 'ja' ? 'ja-JP' : 'en-US')
        : '';
    card.innerHTML = `
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:0.6rem;">${swatches}</div>
        <p style="font-size:0.9rem;font-weight:600;margin:0 0 0.25rem;">${escHtml(data.name || '팔레트')}</p>
        <p style="font-size:0.75rem;color:#aaa;margin:0 0 0.75rem;">${date}</p>
        <a href="/color-palette.html?palette=${encodeURIComponent(JSON.stringify(colors))}" class="secondary-btn small-btn">${escHtml(tr('palette_open'))}</a>
    `;
    return card;
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

    const isPublic = !!data.isPublic;
    card.innerHTML = `
        <div class="cp-palette-swatches" style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:0.6rem;">${swatches}</div>
        <div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.25rem;">
            <p class="cp-palette-name" style="font-size:0.9rem;font-weight:600;margin:0;">${escHtml(data.name || '팔레트')}</p>
            <span class="mp-palette-badge ${isPublic ? 'badge-public' : 'badge-private'}">${escHtml(isPublic ? tr('palette_public') : tr('palette_private'))}</span>
        </div>
        <p style="font-size:0.75rem;color:#aaa;margin:0 0 0.75rem;">${date}</p>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
            <a href="/color-palette.html?palette=${encodeURIComponent(JSON.stringify(colors))}" class="secondary-btn small-btn">${escHtml(tr('palette_open'))}</a>
            <button class="secondary-btn small-btn mp-palette-toggle-btn">${escHtml(isPublic ? tr('palette_make_private') : tr('palette_make_public'))}</button>
            <button class="secondary-btn small-btn mp-palette-rename-btn">${escHtml(tr('palette_rename'))}</button>
            <button class="secondary-btn small-btn mp-palette-delete-btn">${escHtml(tr('palette_delete'))}</button>
        </div>
    `;

    card.querySelector('.mp-palette-toggle-btn').addEventListener('click', async () => {
        const newVal = !data.isPublic;
        try {
            await updateDoc(doc(db, `users/${uid}/palettes/${paletteId}`), { isPublic: newVal });
            data.isPublic = newVal;
            const badge = card.querySelector('.mp-palette-badge');
            const btn   = card.querySelector('.mp-palette-toggle-btn');
            badge.textContent = newVal ? tr('palette_public') : tr('palette_private');
            badge.className   = `mp-palette-badge ${newVal ? 'badge-public' : 'badge-private'}`;
            btn.textContent   = newVal ? tr('palette_make_private') : tr('palette_make_public');
        } catch (e) { console.error(e); }
    });

    card.querySelector('.mp-palette-rename-btn').addEventListener('click', async () => {
        const newName = window.prompt(tr('palette_rename_prompt'), data.name || '');
        if (!newName || newName.trim() === data.name) return;
        const trimmed = newName.trim();
        try {
            await updateDoc(doc(db, `users/${uid}/palettes/${paletteId}`), { name: trimmed });
            card.querySelector('.cp-palette-name').textContent = trimmed;
            data.name = trimmed;
        } catch (e) { console.error(e); }
    });

    card.querySelector('.mp-palette-delete-btn').addEventListener('click', async () => {
        if (!window.confirm(tr('confirm_delete_palette'))) return;
        try {
            await deleteDoc(doc(db, `users/${uid}/palettes/${paletteId}`));
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
    const categoryTag = (data.tags || []).length > 0
        ? `<span class="post-card-thumb-tag">${escHtml(data.tags[0])}</span>` : '';
    const thumb = data.images?.[0]
        ? `<div class="post-card-thumb" style="background-image:url(${escHtml(data.images[0])})"></div>`
        : `<div class="post-card-thumb post-card-thumb-empty">${categoryTag}<span class="post-card-thumb-title">${escHtml(data.title || '')}</span></div>`;
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

// ── 실 재고 관리 (Yarn Stash) ──────────────────────────────────────────────────
function initStash(uid) {
    const btnNew = document.getElementById('btn-new-yarn');
    const modal = document.getElementById('yarnModal');
    const cancelBtn = document.getElementById('btn-yarn-modal-cancel');
    const form = document.getElementById('yarnForm');
    const photoInput = document.getElementById('yarnPhotoInput');
    const photoPreview = document.getElementById('yarnPhotoPreview');

    if (btnNew) btnNew.onclick = () => showYarnModal();
    if (cancelBtn) cancelBtn.onclick = () => closeYarnModal();
    if (photoInput) {
        photoInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                const { validateFile } = await import('./auth.js');
                const v = validateFile(file);
                if (!v.valid) {
                    alert(v.error);
                    e.target.value = '';
                    return;
                }

                yarnPhotoFile = file;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    photoPreview.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
                };
                reader.readAsDataURL(file);
            }
        };
    }

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            await handleYarnSubmit(e, uid);
        };
    }

    loadStash(uid);
}

function loadStash(uid) {
    if (stashUnsub) stashUnsub();
    const q = query(collection(db, `users/${uid}/yarns`), orderBy('createdAt', 'desc'));
    stashUnsub = onSnapshot(q, (snapshot) => {
        const yarns = [];
        snapshot.forEach(doc => yarns.push({ id: doc.id, ...doc.data() }));
        renderStash(yarns);
        const loadingEl = document.getElementById('stashLoading');
        const emptyEl = document.getElementById('stashEmpty');
        if (loadingEl) loadingEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = yarns.length === 0 ? 'block' : 'none';
    });
}

function renderStash(yarns) {
    const grid = document.getElementById('yarnGrid');
    if (!grid) return;
    grid.innerHTML = '';
    yarns.forEach(y => {
        const item = document.createElement('div');
        item.className = 'yarn-item';
        const photoHtml = y.photoURL 
            ? `<img src="${y.photoURL}" alt="${y.name}" loading="lazy">`
            : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg>`;

        
        const qtyBall = y.quantityBall || 0;
        const qtyGram = y.quantityGram ? `(${y.quantityGram}g)` : '';
        const unit = currentLang === 'ko' ? '볼' : (currentLang === 'ja' ? '玉' : 'balls');

        item.innerHTML = `
            <div class="yarn-item-photo">${photoHtml}</div>
            <div class="yarn-item-content">
                <div class="yarn-item-brand">${escHtml(y.brand)}</div>
                <div class="yarn-item-name">${escHtml(y.name)}</div>
                <div class="yarn-item-meta">${escHtml(y.color || '')}</div>
                <div class="yarn-item-meta">${escHtml(y.needleSize || '')}</div>
                <div class="yarn-item-qty">${qtyBall} ${unit} ${qtyGram}</div>
            </div>
            <div class="yarn-item-actions">
                <button class="yarn-action-btn edit" title="수정">✎</button>
                <button class="yarn-action-btn del" title="삭제">✕</button>
            </div>
        `;
        
        item.querySelector('.edit').onclick = () => showYarnModal(y);
        item.querySelector('.del').onclick = () => deleteYarn(y.id, y.photoURL);
        grid.appendChild(item);
    });
}

async function handleYarnSubmit(e, uid) {
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = tr('profile_saving');

    const yarnId = document.getElementById('yarn-form-id').value;
    const brand = document.getElementById('input-yarn-brand').value;
    const name = document.getElementById('input-yarn-name').value;
    const color = document.getElementById('input-yarn-color').value;
    const qtyBall = parseFloat(document.getElementById('input-yarn-qty-ball').value) || 0;
    const qtyGram = parseInt(document.getElementById('input-yarn-qty-gram').value) || 0;
    const needle = document.getElementById('input-yarn-needle').value;
    const notes = document.getElementById('input-yarn-notes').value;

    try {
        let photoURL = null;
        if (yarnPhotoFile) {
            const fileName = `yarn_${Date.now()}`;
            const fileRef = ref(storage, `users/${uid}/yarns/${fileName}`);
            await uploadBytes(fileRef, yarnPhotoFile);
            photoURL = await getDownloadURL(fileRef);
        }

        const yarnData = {
            brand, name, color, 
            quantityBall: qtyBall, 
            quantityGram: qtyGram,
            needleSize: needle,
            notes,
            updatedAt: serverTimestamp()
        };
        if (photoURL) yarnData.photoURL = photoURL;

        if (yarnId) {
            await updateDoc(doc(db, `users/${uid}/yarns/${yarnId}`), yarnData);
        } else {
            yarnData.createdAt = serverTimestamp();
            await addDoc(collection(db, `users/${uid}/yarns`), yarnData);
        }
        closeYarnModal();
    } catch (err) {
        console.error(err);
        alert(tr('profile_edit_error'));
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

async function deleteYarn(yarnId, photoURL) {
    if (!confirm(tr('yarn_delete_confirm'))) return;
    try {
        await deleteDoc(doc(db, `users/${auth.currentUser.uid}/yarns/${yarnId}`));
        // Storage 삭제는 필요 시 추가 (참조가 복잡할 수 있음)
    } catch (err) { console.error(err); }
}

function showYarnModal(y = null) {
    const modal = document.getElementById('yarnModal');
    const form = document.getElementById('yarnForm');
    const title = document.getElementById('yarnModalTitle');
    const photoPreview = document.getElementById('yarnPhotoPreview');
    
    form.reset();
    yarnPhotoFile = null;
    document.getElementById('yarn-form-id').value = y ? y.id : '';
    title.textContent = y ? tr('yarn_modal_title') : tr('yarn_new');
    
    if (y) {
        document.getElementById('input-yarn-brand').value = y.brand || '';
        document.getElementById('input-yarn-name').value = y.name || '';
        document.getElementById('input-yarn-color').value = y.color || '';
        document.getElementById('input-yarn-qty-ball').value = y.quantityBall || 0;
        document.getElementById('input-yarn-qty-gram').value = y.quantityGram || '';
        document.getElementById('input-yarn-needle').value = y.needleSize || '';
        document.getElementById('input-yarn-notes').value = y.notes || '';
        if (y.photoURL) {
            photoPreview.innerHTML = '';
            const img = document.createElement('img');
            img.src = y.photoURL;
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            photoPreview.appendChild(img);
        } else {
            photoPreview.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg>`;
        }
    } else {
        photoPreview.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg>`;
    }
    
    modal.style.display = 'flex';
}

function closeYarnModal() {
    document.getElementById('yarnModal').style.display = 'none';
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

function resetPageState() {
    // panelLoaded 캐시 완전 초기화
    Object.keys(panelLoaded).forEach(k => delete panelLoaded[k]);

    // 사이드바 초기화
    const avatarEl = document.getElementById('mpAvatar');
    if (avatarEl) {
        avatarEl.style.backgroundImage = '';
        avatarEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.5" width="40" height="40">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>`;
    }
    const nickEl = document.getElementById('mpNickname');
    if (nickEl) nickEl.textContent = '';
    const joinEl = document.getElementById('mpJoined');
    if (joinEl) joinEl.textContent = '';
    const bioEl = document.getElementById('mpBio');
    if (bioEl) { bioEl.textContent = ''; bioEl.style.display = 'none'; }
    const bioToggle = document.getElementById('mpBioToggle');
    if (bioToggle) bioToggle.remove();

    // 통계 초기화
    ['mpStatPatterns', 'mpStatPosts', 'mpStatScraps', 'mpStatLikes', 'mpStatPublicPalettes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '—';
    });

    // 패널 콘텐츠 초기화
    ['patternsGrid', 'projectsActive', 'projectsDone', 'scrapsGrid',
     'palettesGrid', 'publicPalettesGrid', 'publicProjectsGrid', 'yarnGrid'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
    ['subPanelPosts', 'subPanelComments'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });

    // user-specific localStorage 키 삭제
    localStorage.removeItem('ssuessue_row_counters');
    localStorage.removeItem('ssuessue_rc_uid');

    // currentPanel 기본값으로 리셋
    currentPanel = urlUid ? 'posts' : 'profile';
}

let _prevUid = null;

onAuthStateChanged(auth, async user => {
    if (urlUid) {
        // 본인 uid로 접근 시 내 마이페이지로 리다이렉트
        if (user && user.uid === urlUid) {
            location.replace('/mypage.html');
            return;
        }
        // 타인 프로필 모드 — 로그인 여부와 무관하게 표시
        currentUid = urlUid;
        viewMode   = 'other';
        document.getElementById('notLoggedIn').style.display = 'none';
        document.getElementById('loggedIn').style.display    = '';
        if (!panelLoaded['_sidebar']) {
            panelLoaded['_sidebar'] = true;
            await fillSidebar(urlUid, /* readOnly */ true);
            await setupOtherUserView();
        }
        // 팔로우 버튼 상태 반영 (user 변경 시마다 갱신)
        updateFollowBtnState(user);
    } else if (user) {
        // 유저가 바뀐 경우(다른 계정으로 재로그인) 상태 초기화
        if (_prevUid !== null && _prevUid !== user.uid) {
            resetPageState();
        }
        _prevUid   = user.uid;
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
        _prevUid   = null;
        currentUid = null;
        resetPageState();
        document.getElementById('notLoggedIn').style.display = '';
        document.getElementById('loggedIn').style.display    = 'none';
        // 비로그인이지만 타인 프로필이 없으면 로그인 유도
        if (!urlUid) openAuthModal();
    }
});

async function setupOtherUserView() {
    // 도안/프로필/프로젝트/스크랩/내 팔레트/실 창고 탭 숨김
    ['mpNavPatterns', 'mpNavProfile', 'mpNavProjects', 'mpNavScraps', 'mpNavPalettes', 'mpNavStash'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    // 내 댓글 서브탭 숨김
    const commentTab = document.getElementById('subtabComments');
    if (commentTab) commentTab.style.display = 'none';

    console.warn('[DEBUG] setupOtherUserView start. mpNavPublicProjects exists:', !!document.getElementById('mpNavPublicProjects'));

    // 공개 팔레트 & 공개 프로젝트 탭 표시
    console.warn('[DEBUG] Public Projects BTN Found:', !!document.getElementById('mpNavPublicProjects'));
    const pubPalBtn = document.getElementById('mpNavPublicPalettes');
    if (pubPalBtn) pubPalBtn.style.display = '';
    const pubProjBtn = document.getElementById('mpNavPublicProjects');
    if (pubProjBtn) pubProjBtn.style.display = '';

    // "내 글·댓글" → "게시글" 레이블 변경
    const postsNavBtn = document.getElementById('mpNavPosts');
    if (postsNavBtn) postsNavBtn.textContent = tr('tab_other_posts');
    const postsTitle = document.querySelector('#panelPosts .mp-panel-title');
    if (postsTitle) postsTitle.textContent = tr('tab_other_posts');

    // 존재하지 않는 uid 체크
    const profile = await getUserProfile(urlUid);
    if (!profile) {
        // DBG: V6
        document.getElementById('loggedIn').innerHTML =
            `<div class="mypage-empty" style="padding:4rem 1rem;">${escHtml(tr('user_not_found'))}</div>`;
        return;
    }

    switchPanel('posts');

    // 팔로우 버튼 노출 및 이벤트 연결 (1회)
    const followBtn = document.getElementById('mpFollowBtn');
    if (followBtn) {
        followBtn.style.display = 'block';

        followBtn.addEventListener('click', async () => {
            if (!auth.currentUser) {
                openAuthModal();
                return;
            }
            followBtn.disabled = true;
            try {
                // 현재 UI 상태에 따라 토글
                const isCurrentlyFollowing = followBtn.classList.contains('secondary-btn');
                if (isCurrentlyFollowing) {
                    await unfollowUser(urlUid);
                } else {
                    await followUser(urlUid);
                }
                // 상태 최신화
                updateFollowBtnState(auth.currentUser);
            } catch (err) {
                console.error(err);
                alert(err.message || '오류가 발생했습니다.');
            } finally {
                followBtn.disabled = false;
            }
        });
    }
}

// 팔로우 버튼 UI 상태 업데이트
async function updateFollowBtnState(user) {
    const followBtn = document.getElementById('mpFollowBtn');
    if (!followBtn) return;
    
    let following = false;
    if (user) {
        try {
            following = await isFollowing(urlUid);
        } catch { following = false; }
    }
    
    if (following) {
        followBtn.textContent = tr('following');
        followBtn.classList.remove('primary-btn');
        followBtn.classList.add('secondary-btn');
    } else {
        followBtn.textContent = tr('follow');
        followBtn.classList.remove('secondary-btn');
        followBtn.classList.add('primary-btn');
    }
}

// ── 팔로우 목록 (본인 전용) ───────────────────────────────────────────────────

async function loadFollowing(uid) {
    const loadingEl = document.getElementById('followingLoading');
    const emptyEl   = document.getElementById('followingEmpty');
    const listEl    = document.getElementById('followingList');
    loadingEl.style.display = 'block';
    emptyEl.style.display   = 'none';
    listEl.innerHTML = '';

    try {
        const snap = await getDocs(query(
            collection(db, 'follows'),
            where('followerId', '==', uid)
        ));
        
        loadingEl.style.display = 'none';
        if (snap.empty) { emptyEl.style.display = 'block'; return; }
        
        // 병렬로 프로필 정보 수집
        const followedUsers = await Promise.all(snap.docs.map(async d => {
            const data = d.data();
            const targetUid = data.followingId;
            const profile = await getUserProfile(targetUid);
            return { uid: targetUid, profile: profile || {} };
        }));

        followedUsers.forEach(user => {
            const card = document.createElement('div');
            card.className = 'mp-project-card';
            card.style.display = 'flex';
            card.style.alignItems = 'center';
            card.style.gap = '1rem';
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => { location.href = `/mypage.html?uid=${user.uid}`; });

            const photoURL = user.profile.profilePhotoURL;
            const photoEl = photoURL 
                ? `<div style="width:40px;height:40px;border-radius:50%;background-image:url('${photoURL}');background-size:cover;background-position:center;flex-shrink:0;"></div>`
                : `<div style="width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#888;flex-shrink:0;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg></div>`;
            
            card.innerHTML = `
                ${photoEl}
                <div style="flex-grow:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;">
                    ${escHtml(user.profile.nickname || 'Unknown')}
                </div>
            `;
            listEl.appendChild(card);
        });
    } catch (e) {
        loadingEl.textContent = '목록을 불러오지 못했습니다.';
        console.error(e);
    }
}

// 모달 닫기
document.getElementById('followingModalCloseBtn')?.addEventListener('click', () => {
    document.getElementById('followingModal').style.display = 'none';
});


