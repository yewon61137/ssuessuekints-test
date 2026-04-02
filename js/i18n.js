// i18n.js — 공통 번역 문자열 및 언어 전환 유틸리티

export const t = {
    ko: {
        // 내비게이션
        btn_signin: '로그인', btn_signout: '로그아웃',
        btn_mypage: '마이페이지', btn_community: '커뮤니티', btn_notice: '공지사항',
        // 인증 모달
        tab_signin: '로그인', tab_signup: '회원가입',
        btn_google: 'Google로 계속하기', btn_signup: '회원가입', or_divider: '또는',
        // 푸터
        footer_generate: '도안 만들기', footer_mypage: '내 도안',
        footer_community: '커뮤니티', footer_about: '소개',
        footer_privacy: '개인정보처리방침', footer_guide: '이용안내', footer_terms: '이용약관',
        // 커뮤니티
        tagline_community: '커뮤니티', btn_write: '글쓰기',
        tag_all: '전체', tag_crochet: '코바늘', tag_knitting: '대바늘',
        tag_finished: '완성작', tag_wip: '진행중', tag_question: '질문',
        feed_loading: '불러오는 중...', feed_empty: '게시글이 없습니다. 첫 글을 작성해보세요!', load_more: '더 보기',
        mag_read_more: '읽기 →',
        // 게이지 계산기
        tool_gauge_title: '게이지 계산기',
        tool_shaping_title: '균등 늘림/줄임',
        tool_convert_title: '도안 변환 계산기',
        label_pattern_gauge: '도안 게이지 (10cm)',
        label_my_gauge: '나의 게이지 (10cm)',
        label_pattern_size: '도안의 코/단 수',
        label_target_res: '내가 뜰 코/단 수',
        // 단수 카운터
        row_counter_title: '단수 카운터',
        add_counter: '카운터 추가',
        reset_all: '전체 초기화',
        delete_confirm: '이 카운터를 삭제하시겠습니까?',
        placeholder_project_name: '프로젝트 이름',
        btn_reset: '초기화',
        label_repeat_unit: '반복 단위',
        label_repeat_count: '반복 횟수',
        label_step_count: '현재 단',
        btn_mode_normal: '일반',
        btn_mode_repeat: '반복',
        tab_general: '일반', tab_project: '프로젝트',
        rc_login_required: '로그인 후 이용 가능합니다.',
        rc_proj_loading: '불러오는 중...', rc_proj_empty: '진행 중인 프로젝트가 없습니다.',
        rc_proj_back: '목록으로', rc_proj_create: '새 프로젝트 만들기',
        rc_parts_empty: '등록된 파트가 없습니다.',
        // 프로젝트
        proj_title: '내 프로젝트',
        proj_new: '새 프로젝트',
        proj_empty: '아직 프로젝트가 없어요. 첫 프로젝트를 만들어보세요!',
        proj_login_required: '로그인 후 프로젝트를 관리할 수 있습니다.',
        proj_login_btn: '로그인하기',
        proj_name_placeholder: '작품명 (예: 봄 가디건)',
        proj_yarn_placeholder: '실 (예: 메리노울 4ply)',
        proj_needle_placeholder: '바늘 (예: 3.5mm 대바늘)',
        proj_start_date: '시작일',
        proj_target_date: '완성 목표일',
        proj_save: '저장',
        proj_cancel: '취소',
        proj_delete: '프로젝트 삭제',
        proj_delete_confirm: '이 프로젝트와 모든 파트를 삭제하시겠습니까?',
        proj_edit: '수정',
        proj_in_progress: '진행중',
        proj_done: '완성',
        proj_pending: '시작전',
        proj_progress_label: '완료된 파트',
        // 파트
        part_new: '파트 추가',
        part_empty: '파트가 없습니다. 파트를 추가해보세요.',
        part_name_placeholder: '파트명 (예: 몸통 앞판)',
        part_target_rows: '목표 단수',
        part_alarm_row: '알림 단',
        part_memo: '메모',
        part_delete: '파트 삭제',
        part_delete_confirm: '이 파트를 삭제하시겠습니까?',
        part_status_pending: '⬜ 예정',
        part_status_in_progress: '🔄 진행중',
        part_status_done: '✅ 완료',
        part_mark_done: '파트 완료로 표시',
        part_mark_in_progress: '진행중으로 변경',
        part_open_counter: '단수 카운터 열기',
        part_repeat_unit: '반복 단위',
        // 도안 PDF
        pdf_upload: '도안 PDF 업로드',
        pdf_uploading: '업로드 중...',
        pdf_view: '도안 보기',
        pdf_delete: 'PDF 삭제',
        pdf_delete_confirm: '도안 PDF를 삭제하시겠습니까?',
        pdf_replace: 'PDF 교체',
        pdf_error_type: 'PDF 파일만 업로드 가능합니다.',
        pdf_error_size: '파일 크기는 20MB 이하여야 합니다.',
        pdf_upload_done: 'PDF 업로드 완료!',
        pdf_upload_select: 'PDF 파일 선택',
        // 진행 사진 & 타이머
        proj_photos_title: '진행 사진',
        photo_upload: '사진 추가',
        photo_delete_confirm: '이 사진을 삭제하시겠습니까?',
        photo_uploading: '사진 업로드 중...',
        photo_upload_done: '사진 업로드 완료!',
        timer_start: '시작',
        timer_pause: '일시정지',
        total_time_spent: '프로젝트 총 시간',
        today_time_spent: '오늘 뜬 시간',
        part_time_spent: '파트 누적 시간',
        // 실 재고 (Yarn Stash)
        tab_stash: '내 실 창고',
        title_stash: '내 실 창고',
        yarn_new: '실 등록',
        yarn_modal_title: '실 정보 등록',
        yarn_label_brand: '브랜드',
        yarn_label_name: '실 이름',
        yarn_label_color: '색상/로트',
        yarn_label_quantity: '보유량 (볼/타래)',
        yarn_label_weight: '무게 (g)',
        yarn_label_needle: '추천 바늘',
        yarn_label_notes: '메모',
        yarn_delete_confirm: '이 실을 삭제하시겠습니까?',
        yarn_upload_error: '사진 업로드 중 오류가 발생했습니다.',
        // Filet Crochet
        tab_pixel: '픽셀 도안',
        tab_filet: '방안뜨기 (모눈)',
        filet_upload_label: '1. 밑그림 이미지를 업로드하세요 (선택)',
        filet_settings_title: '2. 방안뜨기 도안 설정',
        label_grid_size: '격자 크기 (가로 × 세로)',
        label_threshold: '이미지 변환 임계값',
        label_filet_gauge: '게이지 (10x10cm 기준)',
        label_filet_sts: '가로 코수',
        label_filet_rows: '세로 단수',
        filet_result_size: '완성 예상 크기',
        btn_convert_filet: '이미지를 격자로 변환',
        btn_clear_grid: '격자 초기화',
        legend_filet: '범례: ■ 채움(한길긴뜨기 묶음), □ 비움(방안)',
        // Follow
        follow: '팔로우', following: '팔로잉',
        my_following: '팔로우 목록', stat_following: '팔로잉', stat_followers: '팔로워',
        filter_following: '팔로우 중',
    },
    en: {
        btn_signin: 'Sign In', btn_signout: 'Sign Out',
        btn_mypage: 'My Page', btn_community: 'Community', btn_notice: 'Notice',
        tab_signin: 'Sign In', tab_signup: 'Sign Up',
        btn_google: 'Continue with Google', btn_signup: 'Sign Up', or_divider: 'or',
        footer_generate: 'Create Pattern', footer_mypage: 'My Patterns',
        footer_community: 'Community', footer_about: 'About',
        footer_privacy: 'Privacy Policy', footer_guide: 'Guide', footer_terms: 'Terms of Service',
        tagline_community: 'Community', btn_write: 'Write',
        tag_all: 'All', tag_crochet: 'Crochet', tag_knitting: 'Knitting',
        tag_finished: 'Finished', tag_wip: 'WIP', tag_question: 'Q&A',
        feed_loading: 'Loading...', feed_empty: 'No posts yet. Be the first to write!', load_more: 'Load More',
        mag_read_more: 'Read →',
        // Gauge Calculator
        tool_gauge_title: 'Gauge Calculator',
        tool_shaping_title: 'Even Shaping',
        tool_convert_title: 'Pattern Converter',
        label_pattern_gauge: 'Pattern Gauge (10cm)',
        label_my_gauge: 'My Gauge (10cm)',
        label_pattern_size: 'Pattern Stitches/Rows',
        label_target_res: 'My Stitches/Rows',
        // Row Counter
        row_counter_title: 'Row Counter',
        add_counter: 'Add Counter',
        reset_all: 'Reset All',
        delete_confirm: 'Delete this counter?',
        placeholder_project_name: 'Project Name',
        btn_reset: 'Reset',
        label_repeat_unit: 'Repeat Unit',
        label_repeat_count: 'Repeat',
        label_step_count: 'Row',
        btn_mode_normal: 'Normal',
        btn_mode_repeat: 'Repeat',
        tab_general: 'General', tab_project: 'Projects',
        rc_login_required: 'Sign in to use this feature.',
        rc_proj_loading: 'Loading...', rc_proj_empty: 'No active projects.',
        rc_proj_back: 'Back to list', rc_proj_create: 'Create new project',
        rc_parts_empty: 'No parts found.',
        // Projects
        proj_title: 'My Projects',
        proj_new: 'New Project',
        proj_empty: 'No projects yet. Create your first project!',
        proj_login_required: 'Please sign in to manage your projects.',
        proj_login_btn: 'Sign In',
        proj_name_placeholder: 'Project name (e.g. Spring Cardigan)',
        proj_yarn_placeholder: 'Yarn (e.g. Merino Wool 4ply)',
        proj_needle_placeholder: 'Needle (e.g. 3.5mm)',
        proj_start_date: 'Start Date',
        proj_target_date: 'Target Date',
        proj_save: 'Save',
        proj_cancel: 'Cancel',
        proj_delete: 'Delete Project',
        proj_delete_confirm: 'Delete this project and all its parts?',
        proj_edit: 'Edit',
        proj_in_progress: 'In Progress',
        proj_done: 'Completed',
        proj_pending: 'Not Started',
        proj_progress_label: 'parts done',
        // Parts
        part_new: 'Add Part',
        part_empty: 'No parts yet. Add a part to get started.',
        part_name_placeholder: 'Part name (e.g. Front Body)',
        part_target_rows: 'Target Rows',
        part_alarm_row: 'Alert Row',
        part_memo: 'Memo',
        part_delete: 'Delete Part',
        part_delete_confirm: 'Delete this part?',
        part_status_pending: '⬜ Planned',
        part_status_in_progress: '🔄 In Progress',
        part_status_done: '✅ Done',
        part_mark_done: 'Mark as Done',
        part_mark_in_progress: 'Set In Progress',
        part_open_counter: 'Open Row Counter',
        part_repeat_unit: 'Repeat Unit',
        // Pattern PDF
        pdf_upload: 'Upload Pattern PDF',
        pdf_uploading: 'Uploading...',
        pdf_view: 'View Pattern',
        pdf_delete: 'Delete PDF',
        pdf_delete_confirm: 'Delete the pattern PDF?',
        pdf_replace: 'Replace PDF',
        pdf_error_type: 'Only PDF files are allowed.',
        pdf_error_size: 'File must be 20MB or smaller.',
        pdf_upload_done: 'PDF uploaded!',
        pdf_upload_select: 'Select PDF file',
        // Progress Photos & Timer
        proj_photos_title: 'Progress Photos',
        photo_upload: 'Add Photo',
        photo_delete_confirm: 'Delete this photo?',
        photo_uploading: 'Uploading photo...',
        photo_upload_done: 'Photo uploaded!',
        timer_start: 'Start',
        timer_pause: 'Pause',
        total_time_spent: 'Project Total',
        today_time_spent: "Today's Time",
        part_time_spent: 'Part Total',
        // Yarn Stash
        tab_stash: 'My Yarn Stash',
        title_stash: 'My Yarn Stash',
        yarn_new: 'Add Yarn',
        yarn_modal_title: 'Register Yarn Info',
        yarn_label_brand: 'Brand',
        yarn_label_name: 'Yarn Name',
        yarn_label_color: 'Color/Lot',
        yarn_label_quantity: 'Quantity (Balls)',
        yarn_label_weight: 'Weight (g)',
        yarn_label_needle: 'Recommended Needle',
        yarn_label_notes: 'Notes',
        yarn_delete_confirm: 'Delete this yarn?',
        yarn_upload_error: 'Error uploading photo.',
        // Filet Crochet
        tab_pixel: 'Pixel Art',
        tab_filet: 'Filet Crochet',
        filet_upload_label: '1. Upload background image (Optional)',
        filet_settings_title: '2. Filet Pattern Settings',
        label_grid_size: 'Grid Size (Width × Height)',
        label_threshold: 'Conversion Threshold',
        label_filet_gauge: 'Gauge (per 10x10cm)',
        label_filet_sts: 'Stitches',
        label_filet_rows: 'Rows',
        filet_result_size: 'Estimated Size',
        btn_convert_filet: 'Convert to Grid',
        btn_clear_grid: 'Clear Grid',
        legend_filet: 'Legend: ■ Filled, □ Empty',
        // Follow
        follow: 'Follow', following: 'Following',
        my_following: 'Following', stat_following: 'Following', stat_followers: 'Followers',
        filter_following: 'Following',
    },
    ja: {
        btn_signin: 'ログイン', btn_signout: 'ログアウト',
        btn_mypage: 'マイページ', btn_community: 'コミュニティ', btn_notice: 'お知らせ',
        tab_signin: 'ログイン', tab_signup: '新規登録',
        btn_google: 'Googleで続ける', btn_signup: '新規登録', or_divider: 'または',
        footer_generate: '編み図を作る', footer_mypage: 'マイ編み図',
        footer_community: 'コミュニティ', footer_about: '紹介',
        footer_privacy: 'プライバシーポリシー', footer_guide: 'ご利用案内', footer_terms: '利用規約',
        tagline_community: 'コミュニティ', btn_write: '投稿する',
        tag_all: 'すべて', tag_crochet: 'かぎ針', tag_knitting: '棒針',
        tag_finished: '完成作品', tag_wip: '制作中', tag_question: '質問',
        feed_loading: '読み込み中...', feed_empty: '投稿がありません。最初の投稿をしてみましょう！', load_more: 'もっと見る',
        mag_read_more: '読む →',
        // ゲージ計算機
        tool_gauge_title: 'ゲージ計算機',
        tool_shaping_title: '均等な増減目',
        tool_convert_title: '編み図変換計算機',
        label_pattern_gauge: '編み図のゲージ (10cm)',
        label_my_gauge: '自分のゲージ (10cm)',
        label_pattern_size: '編み図の目数・段数',
        label_target_res: '自分が編む目数・段数',
        // 段数カウンター
        row_counter_title: '段数カウンター',
        add_counter: 'カウンター追加',
        reset_all: 'すべてリセット',
        delete_confirm: 'このカウンターを削除しますか？',
        placeholder_project_name: 'プロジェクト名',
        btn_reset: 'リセット',
        label_repeat_unit: '繰り返し単位',
        label_repeat_count: '繰り返し回数',
        label_step_count: '現在の段',
        btn_mode_normal: '通常',
        btn_mode_repeat: '繰り返し',
        tab_general: '通常', tab_project: 'プロジェクト',
        rc_login_required: 'ログイン後にご利用いただけます。',
        rc_proj_loading: '読み込み中...', rc_proj_empty: '進行中のプロジェクトがありません。',
        rc_proj_back: '一覧へ', rc_proj_create: '新しいプロジェクトを作成',
        rc_parts_empty: 'パートが登録されていません。',
        // プロジェクト
        proj_title: '自分のプロジェクト',
        proj_new: '新しいプロジェクト',
        proj_empty: 'プロジェクトがまだありません。最初のプロジェクトを作成しましょう！',
        proj_login_required: 'プロジェクトを管理するにはログインしてください。',
        proj_login_btn: 'ログイン',
        proj_name_placeholder: 'プロジェクト名（例：春のカーディガン）',
        proj_yarn_placeholder: '糸（例：メリノウール4ply）',
        proj_needle_placeholder: '針（例：3.5mm）',
        proj_start_date: '開始日',
        proj_target_date: '目標完成日',
        proj_save: '保存',
        proj_cancel: 'キャンセル',
        proj_delete: 'プロジェクトを削除',
        proj_delete_confirm: 'このプロジェクトとすべてのパーツを削除しますか？',
        proj_edit: '編集',
        proj_in_progress: '進行中',
        proj_done: '完成',
        proj_pending: '未開始',
        proj_progress_label: 'パート完了',
        // パーツ
        part_new: 'パートを追加',
        part_empty: 'パートがありません。パートを追加しましょう。',
        part_name_placeholder: 'パート名（例：身頃前面）',
        part_target_rows: '目標段数',
        part_alarm_row: 'アラート段',
        part_memo: 'メモ',
        part_delete: 'パートを削除',
        part_delete_confirm: 'このパートを削除しますか？',
        part_status_pending: '⬜ 予定',
        part_status_in_progress: '🔄 進行中',
        part_status_done: '✅ 完了',
        part_mark_done: '完了としてマーク',
        part_mark_in_progress: '進行中に変更',
        part_open_counter: '段数カウンターを開く',
        part_repeat_unit: '繰り返し単位',
        // 編み図PDF
        pdf_upload: '編み図PDFをアップロード',
        pdf_uploading: 'アップロード中...',
        pdf_view: '編み図を見る',
        pdf_delete: 'PDFを削除',
        pdf_delete_confirm: '編み図PDFを削除しますか？',
        pdf_replace: 'PDFを入れ替え',
        pdf_error_type: 'PDFファイルのみアップロードできます。',
        pdf_error_size: 'ファイルサイズは20MB以下である必要があります。',
        pdf_upload_done: 'PDFアップロード完了！',
        pdf_upload_select: 'PDFファイルを選択',
        // 進行写真 & タイマー
        proj_photos_title: '進行写真',
        photo_upload: '写真を追加',
        photo_delete_confirm: 'この写真を削除しますか？',
        photo_uploading: '写真をアップロード中...',
        photo_upload_done: '写真のアップロード完了！',
        timer_start: '開始',
        timer_pause: '一時停止',
        total_time_spent: 'プロジェクト合計',
        today_time_spent: '今日の作業時間',
        part_time_spent: 'パート累計時間',
        // 毛糸倉庫 (Yarn Stash)
        tab_stash: 'マイ毛糸倉庫',
        title_stash: 'マイ毛糸倉庫',
        yarn_new: '毛糸を登録',
        yarn_modal_title: '毛糸情報の登録',
        yarn_label_brand: 'ブランド',
        yarn_label_name: '毛糸名',
        yarn_label_color: '色/ロット',
        yarn_label_quantity: '保有量 (玉)',
        yarn_label_weight: '重さ (g)',
        yarn_label_needle: 'おすすめの針',
        yarn_label_notes: 'メモ',
        yarn_delete_confirm: 'この毛糸を削除しますか？',
        yarn_upload_error: '写真のアップロード中にエラーが発生しました。',
        // Filet Crochet
        tab_pixel: 'ピクセル編み図',
        tab_filet: '方眼編み (ネット)',
        filet_upload_label: '1. 下絵画像をアップロード (任意)',
        filet_settings_title: '2. 方眼編み図の設定',
        label_grid_size: '格子サイズ (横 × 縦)',
        label_threshold: '画像変換しきい値',
        label_filet_gauge: 'ゲージ (10x10cm基準)',
        label_filet_sts: '横の目数',
        label_filet_rows: '縦の段数',
        filet_result_size: '仕上がり予想サイズ',
        btn_convert_filet: '画像を格子に変換',
        btn_clear_grid: '格子を初期화',
        legend_filet: '凡例: ■ 埋める, □ 空ける',
        // Follow
        follow: 'フォロー', following: 'フォロー中',
        my_following: 'フォロー・フォロワー', stat_following: 'フォロー', stat_followers: 'フォロワー',
        filter_following: 'フォロー中',
    }
};

/**
 * 언어를 페이지 전체에 적용합니다.
 * @param {string} lang - 'ko' | 'en' | 'ja'
 * @param {{ pageTitles?: Record<string,string>, extra?: Record<string, Record<string,string>> }} [opts]
 */
export function applyLang(lang, opts = {}) {
    const { pageTitles, extra } = opts;

    localStorage.setItem('ssuessue_lang', lang);
    document.documentElement.lang = lang;

    // 언어 버튼 활성화
    document.querySelectorAll('.lang-btn[data-lang]').forEach(b =>
        b.classList.toggle('active', b.getAttribute('data-lang') === lang));

    // 페이지 타이틀
    if (pageTitles)
        document.title = (pageTitles[lang] || pageTitles.ko) + ' | SSUESSUE KNITS';

    // data-ko/en/ja + .i18n 패턴
    document.querySelectorAll('.i18n').forEach(el => {
        const val = el.getAttribute('data-' + lang);
        if (val !== null) {
            if (/<[a-z]/i.test(val) || val.includes('&')) el.innerHTML = val;
            else el.textContent = val;
        }
    });

    // data-i18n 패턴 (공통 + 페이지별 병합)
    const merged = { ...t[lang], ...(extra?.[lang] ?? {}) };
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (merged[key] !== undefined) el.textContent = merged[key];
    });

    // data-lang-section 블록 전환
    document.querySelectorAll('[data-lang-section]').forEach(el => {
        el.style.display = el.getAttribute('data-lang-section') === lang ? 'block' : 'none';
    });

    // 네이버 로그인은 한국어 사용자에게만 표시
    document.querySelectorAll('.naver-btn').forEach(el => {
        el.style.display = lang === 'ko' ? '' : 'none';
    });

    // 언어 변경 이벤트 발행
    window.dispatchEvent(new CustomEvent('langChange', { detail: { lang } }));
}

/**
 * 언어 전환 버튼 이벤트를 등록하고 저장된 언어를 즉시 적용합니다.
 * @param {{ pageTitles?: Record<string,string>, extra?: Record<string, Record<string,string>> }} [opts]
 */
export function initLang(opts = {}) {
    const handler = lang => applyLang(lang, opts);
    document.querySelectorAll('.lang-btn[data-lang]').forEach(btn =>
        btn.addEventListener('click', () => handler(btn.getAttribute('data-lang'))));
    const saved = localStorage.getItem('ssuessue_lang');
    if (saved) {
        handler(saved);
    } else {
        // 첫 방문: 브라우저 언어 자동 감지
        const browser = (navigator.language || 'ko').toLowerCase();
        const detected = browser.startsWith('ja') ? 'ja'
                       : browser.startsWith('ko') ? 'ko'
                       : 'en'; // 그 외 모든 언어 → 영어
        handler(detected);
    }
}

/**
 * 현재 설정된 언어를 반환합니다.
 * @returns {string} 'ko' | 'en' | 'ja'
 */
export function getLang() {
    return localStorage.getItem('ssuessue_lang') || 'ko';
}

/**
 * Firestore 타임스탬프 또는 Date 객체를 현재 언어 로캘에 맞춰 포맷팅합니다.
 * @param {object|Date} ts - Firestore Timestamp {seconds, nanoseconds} 또는 Date 객체
 * @returns {string} 포맷팅된 날짜 문자열
 */
export function formatDate(ts) {
    if (!ts) return '';
    const date = ts instanceof Date ? ts : new Date(ts.seconds * 1000);
    const lang = getLang();
    const locale = lang === 'ko' ? 'ko-KR' : lang === 'ja' ? 'ja-JP' : 'en-US';
    
    return date.toLocaleString(locale, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
