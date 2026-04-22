// main.js - 뜨개질 도안 생성기 핵심 로직

import { getPixelArray, kMeans, rgbToHex, hexToRgb, detectOptimalColorCount, mergeByDeltaE, applyMedianFilter } from './colorUtils.js';
import { initAuth, getCurrentUser, savePatternToCloud, openAuthModal, setOnAuthComplete, showLoginRequiredToast } from './auth.js';
import { t as sharedT } from './i18n.js';

// --- 상태 관리 ---
let originalImage = null;
let patternHistory = []; // { dataURL, palette, infoText, id }
let isPreviewMode = false;
let seedColors = [];
let isEditMode = false;
let activeColorIndex = 0;
let showSymbols = false;
let currentPatternData = null; // { cols, rows, assignments, palette, gauge }
let activeTool = 'view'; // 'view', 'pencil', 'eraser', 'picker'
let bgIndex = 0; // Likely background color index
let editHistory = []; // Stack of assignments clones
let lastSavedTitle = null;
let lastSavedDocId = null;
let isOverlayVisible = false;
const MAX_EDIT_HISTORY = 30;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_CANVAS_DIMENSION = 4000;

// --- DOM 요소 ---
const imageUpload = document.getElementById('imageUpload');
const mainUploadWrapper = imageUpload ? imageUpload.closest('.file-upload-wrapper') : null;
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const resultPlaceholder = document.getElementById('resultPlaceholder');
const previewArea = document.getElementById('previewArea');
const previewCanvas = document.getElementById('previewCanvas');
const previewCtx = previewCanvas ? previewCanvas.getContext('2d', { willReadFrequently: true }) : null;
const settingsArea = document.getElementById('settingsArea');
const techniqueRatioSelect = document.getElementById('techniqueRatio');
const yarnUnitRadios = document.getElementsByName('yarnUnit');
const yarnNameGroup = document.getElementById('yarnNameGroup');
const yarnMmGroup = document.getElementById('yarnMmGroup');
const yarnWeightSelect = document.getElementById('yarnWeight');
const yarnMmInput = document.getElementById('yarnMm');
const targetWidthInput = document.getElementById('targetWidth');
const colorCountInput = document.getElementById('colorCount');
const seedColorList = document.getElementById('seedColorList');
const clearSeedsBtn = document.getElementById('clearSeedsBtn');
const showGridCheckbox = document.getElementById('showGrid');
const generateBtn = document.getElementById('generateBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const saveToCloudBtn = document.getElementById('saveToCloudBtn');
const statusMessage = document.getElementById('statusMessage');
const resultPanel = document.getElementById('resultPanel');
const patternInfo = document.getElementById('patternInfo');
const canvas = document.getElementById('patternCanvas');
const ctx = canvas ? canvas.getContext('2d', { willReadFrequently: true }) : null;
const magnifierCanvas = document.getElementById('magnifierCanvas');
const magnifierCtx = magnifierCanvas ? magnifierCanvas.getContext('2d') : null;
const compareCanvas = document.getElementById('compareCanvas');
const compareCtx = compareCanvas ? compareCanvas.getContext('2d') : null;
const colorLegend = document.getElementById('colorLegend');
const historyPanel = document.getElementById('historyPanel');
const historyThumbnails = document.getElementById('historyThumbnails');
const langBtns = document.querySelectorAll('.lang-btn');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

const editToolbar = document.getElementById('editToolbar');
const viewToolBtn = document.getElementById('viewToolBtn');
const compareToolBtn = document.getElementById('compareToolBtn');
const pencilToolBtn = document.getElementById('pencilToolBtn');
const eraserToolBtn = document.getElementById('eraserToolBtn');
const pickerToolBtn = document.getElementById('pickerToolBtn');
const undoBtn = document.getElementById('undoBtn');
const toggleSymbols = document.getElementById('toggleSymbols');
const activeColorDisplay = document.getElementById('activeColorDisplay');
const activeColorBox = document.getElementById('activeColorBox');
const toolbarPalette = document.getElementById('toolbarPalette');

// 초기 상태에서는 편집 툴바 숨김 (CSS display: none 초기값 활용)
if (editToolbar) editToolbar.style.display = 'none';

// --- 번역 데이터 (i18n) ---
const translations = {
    ko: {
        tagline: "당신의 픽셀을 뜨개 도안으로 만듭니다.",
        upload_label: "1. 도안으로 만들 이미지를 업로드하세요",
        preview_title: "2. 원본 이미지 확인 및 필수 색상 선택",
        preview_desc: "사진에서 살리고 싶은 중요한 색상(예: 눈동자, 옷 등)을 클릭(모바일은 꾹 누르기)하여 선택하세요.",
        upload_placeholder: "이미지를 업로드해주세요.",
        selected_colors: "선택된 필수 색상",
        no_colors_selected: "아직 선택된 색상이 없습니다.",
        clear_selection: "선택 초기화",
        settings_title: "3. 도안 세부 설정",
        label_technique: "뜨개 기법 (코:단 비율)",
        opt_ratio_1: "코바늘 / 십자수 (1:1)",
        opt_ratio_2: "대바늘 인물 사진 (5:7)",
        opt_ratio_3: "대바늘 풍경 사진 (7:5)",
        label_yarn_unit: "실 굵기 입력 방식",
        unit_standard: "표준 규격",
        unit_mm: "직경 (mm)",
        label_yarn_name: "실 굵기 (표준)",
        label_yarn_mm: "실 굵기 (mm)",
        label_width: "원하는 편물의 가로 크기",
        label_max_colors: "최대 색상 수",
        color_count_hint: "이미지에 따라 실제 색상 수는 더 적을 수 있어요. 색상이 적을수록 뜨개하기 쉬워요 😊",
        unit_colors: "색",
        label_grid: "10단위 그리드 및 좌표 표시",
        label_smoothing: "도안 노이즈 스무딩 (부드럽게)",
        label_contrast: "윤곽선/대비 강조",
        contrast_hint: "흐릿한 사진의 윤곽선을 더 뚜렷하게 잡고 싶을 때 수치를 올려주세요.",
        regen_hint: "💡 버튼을 다시 누를 때마다 조금씩 다른 도안이 생성됩니다.",
        btn_generate: "도안 생성하기",
        btn_download: "PDF 다운로드",
        btn_save_cloud: "내 도안에 저장",
        btn_save_cloud_done: "저장 완료 ✓",
        btn_save_cloud_saving: "저장 중...",
        save_login_required: "로그인 후 저장할 수 있습니다.",
        btn_select_file: "파일 선택",
        no_file_selected: "선택된 파일 없음",
        result_title: "4. 생성된 도안",
        result_placeholder: "도안을 생성하면 여기에 표시됩니다.",
        history_title: "최근 생성 기록 (클릭하여 비교)",
        legend_title: "사용된 색상표 (실 번호)",
        status_loaded: "이미지가 로드되었습니다. 설정을 확인하고 도안을 생성하세요.",
        status_generating: "도안 생성 중... 잠시만 기다려주세요.",
        status_done: "도안 생성 완료!",
        status_error: "생성 중 오류 발생",
        status_format_err: "JPG 또는 PNG 파일만 업로드 가능합니다.",
        status_size_err: "파일 크기가 너무 큽니다 (최대 10MB).",
        status_pdf_err: "PDF 라이브러리를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
        footer_about: "소개",
        footer_terms: "이용약관",
        footer_privacy: "개인정보처리방침",
        footer_guide: "이용안내",
        copyright_notice: "⚠️ 타인의 사진·캐릭터·예술 작품으로 생성한 도안을 상업적으로 이용할 경우 저작권법 위반의 책임은 전적으로 이용자 본인에게 있습니다. <a href='/privacy.html#disclaimer' aria-label='저작권 면책 고지 자세히 보기'>자세히 보기</a>",
        status_saved: "도안이 저장되었습니다.",
        filet_upload_label: "1. 밑그림 이미지를 업로드하세요 (선택)",
        filet_settings_title: "2. 방안뜨기 도안 설정",
        label_grid_size: "격자 크기 (가로 × 세로)",
        label_threshold: "이미지 변환 임계값",
        label_filet_gauge: "게이지 (10x10cm 기준)",
        label_filet_sts: "가로 코수",
        label_filet_rows: "세로 단수",
        filet_result_size: "완성 예상 크기",
        btn_convert_filet: "이미지를 격자로 변환",
        btn_clear_grid: "격자 초기화",
        legend_filet: "범례: ■ 채움(한길긴뜨기 묶음), □ 비움(방안)",
        label_filet_yarn_type: "실 종류 (대략적인 굵기)",
        preset_custom: "직접 입력 (게이지)",
        preset_lace40: "극세 레이스사 (#40)",
        preset_lace20: "일반 레이스사 (#20)",
        preset_summer: "여름용 면사 (코바늘 0-2호)",
        preset_winter: "일반 털실 (코바늘 3-5호)",
        recommended: "추천",
        label_show_symbols: "기호 표시",
        label_active_color: "편집 색상",
        tooltip_compare: "원본 사진 오버레이 켜기/끄기",
        tooltip_pencil: "연필 (그리기)",
        tooltip_eraser: "지우개 (바탕색으로 칠하기)",
        tooltip_picker: "색상 추출 (도안에서 선택)",
        tooltip_undo: "되돌리기 (Ctrl+Z)",
        status_too_large: "코/단 수가 너무 많습니다. 더 작은 크기나 굵은 실을 선택해주세요.",
        btn_modal_save: "저장",
        prompt_pdf_filename: "저장할 파일 이름을 입력하세요 (.pdf 자동 추가)",
        save_error: "저장 중 오류가 발생했습니다.",
        placeholder_pattern_title: "도안 이름 (필수, 최대 50자)",
        btn_cancel: "취소",
        modal_save_pattern_title: "도안 저장",
        rec_click_hint: "클릭하여 적용",
    },
    en: {
        tagline: "Crafting your pixels into knit patterns.",
        upload_label: "1. Upload an image to create a pattern",
        preview_title: "2. Original Image & Seed Color Selection",
        preview_desc: "Click (or long-press on mobile) on the image to select essential colors you want to preserve.",
        upload_placeholder: "Please upload an image.",
        selected_colors: "Selected Essential Colors",
        no_colors_selected: "No colors selected yet.",
        clear_selection: "Clear Selection",
        settings_title: "3. Pattern Settings",
        label_technique: "Stitch Technique (Ratio)",
        opt_ratio_1: "Crochet / Cross Stitch (1:1)",
        opt_ratio_2: "Knit Portrait (5:7)",
        opt_ratio_3: "Knit Landscape (7:5)",
        label_yarn_unit: "Yarn Weight Input Mode",
        unit_standard: "Standard",
        unit_mm: "Diameter (mm)",
        label_yarn_name: "Yarn Weight (Standard)",
        label_yarn_mm: "Yarn Weight (mm)",
        label_width: "Desired Finished Width",
        label_max_colors: "Max Color Count",
        color_count_hint: "Actual colors may be fewer depending on the image. Fewer colors = easier to knit 😊",
        unit_colors: "colors",
        label_grid: "Show 10-unit Grid & Coordinates",
        label_smoothing: "Pattern Noise Smoothing (Softer)",
        label_contrast: "Outline & Contrast Boost",
        contrast_hint: "Increase this to make the outlines sharper and more distinct for blurry photos.",
        regen_hint: "💡 Re-generate to get slightly different color combinations.",
        btn_generate: "Generate Pattern",
        btn_download: "Download PDF",
        btn_save_cloud: "Save to My Patterns",
        btn_save_cloud_done: "Saved ✓",
        btn_save_cloud_saving: "Saving...",
        save_login_required: "Sign in to save.",
        btn_select_file: "Choose File",
        no_file_selected: "No file chosen",
        result_title: "4. Generated Pattern",
        result_placeholder: "Pattern will appear here after generation.",
        history_title: "Recent History (Click to compare)",
        legend_title: "Color Legend (Thread No.)",
        status_loaded: "Image loaded. Adjust settings and generate.",
        status_generating: "Generating pattern... please wait.",
        status_done: "Pattern generation complete!",
        status_error: "Error during generation",
        status_format_err: "Only JPG or PNG files are supported.",
        status_size_err: "File is too large (Max 10MB).",
        status_pdf_err: "Failed to load PDF library. Please try again later.",
        footer_about: "About",
        footer_terms: "Terms of Service",
        footer_privacy: "Privacy Policy",
        footer_guide: "Guide",
        copyright_notice: "⚠️ You are solely responsible for any copyright infringement if you use patterns generated from others' photos, characters, or artwork for commercial purposes. <a href='/privacy.html#disclaimer' aria-label='Learn more about copyright disclaimer'>Learn more</a>",
        status_saved: "Pattern saved to your account.",
        filet_upload_label: "1. Upload a background image (Optional)",
        filet_settings_title: "2. Filet Crochet Settings",
        label_grid_size: "Grid Size (Width × Height)",
        label_threshold: "Image Conversion Threshold",
        label_filet_gauge: "Gauge (per 10x10cm)",
        label_filet_sts: "Stitches",
        label_filet_rows: "Rows",
        filet_result_size: "Estimated Finished Size",
        btn_convert_filet: "Convert Image to Grid",
        btn_clear_grid: "Clear Grid",
        legend_filet: "Legend: ■ Fill (DC block), □ Empty (Mesh space)",
        label_filet_yarn_type: "Yarn Type (Approx. Weight)",
        preset_custom: "Custom (Manual Gauge)",
        preset_lace40: "Ultra Fine Lace (#40)",
        preset_lace20: "Standard Lace (#20)",
        preset_summer: "Summer Cotton (0-2 Hook)",
        preset_winter: "Standard Wool (3-5 Hook)",
        recommended: "Recommended",
        label_show_symbols: "Show Symbols",
        label_active_color: "Active Color",
        tooltip_compare: "Toggle Original Photo Overlay",
        tooltip_pencil: "Pencil (Draw)",
        tooltip_eraser: "Eraser (Remove)",
        tooltip_picker: "Color Picker (Eyedropper)",
        tooltip_undo: "Undo (Ctrl+Z)",
        status_too_large: "Too many stitches/rows. Try a smaller size or thicker yarn.",
        btn_modal_save: "Save",
        prompt_pdf_filename: "Enter file name (.pdf will be added automatically)",
        save_error: "An error occurred while saving.",
        placeholder_pattern_title: "Pattern name (required, max 50 chars)",
        btn_cancel: "Cancel",
        modal_save_pattern_title: "Save Pattern",
        rec_click_hint: "Click to apply",
    },
    ja: {
        tagline: "あなたのピクセルを編み図に変えます。",
        upload_label: "1. 編み図にする画像をアップロードしてください",
        preview_title: "2. オリジナル画像と必須色の選択",
        preview_desc: "画像をクリック（モバイルは長押し）して、残したい重要な色を選択してください。",
        upload_placeholder: "画像をアップロードしてください。",
        selected_colors: "選択された必須色",
        no_colors_selected: "まだ色が選択されていません。",
        clear_selection: "選択を解除",
        settings_title: "3. 編み図の詳細設定",
        label_technique: "編み技法 (比率)",
        opt_ratio_1: "かぎ針編み / クロスステッチ (1:1)",
        opt_ratio_2: "棒針編み 人物 (5:7)",
        opt_ratio_3: "棒針編み 風景 (7:5)",
        label_yarn_unit: "糸の太さの入力方式",
        unit_standard: "標準規格",
        unit_mm: "直径 (mm)",
        label_yarn_name: "糸の太さ (標準)",
        label_yarn_mm: "糸の太さ (mm)",
        label_width: "仕上がり幅",
        label_max_colors: "最大色数",
        color_count_hint: "画像によっては実際の色数がより少なくなることがあります。色が少ないほど編みやすくなります 😊",
        unit_colors: "色",
        label_grid: "10単位グリッドと座標を表示",
        label_smoothing: "図案ノイズスムージング（滑らかに）",
        label_contrast: "輪郭・コントラスト強調",
        contrast_hint: "ぼやけた写真の輪郭をはっきりさせたい場合に数値を上げてください。",
        regen_hint: "💡 ボタンをもう一度押すと、少しずつ異なる配色が生成されます。",
        btn_generate: "編み図を生成",
        btn_download: "PDFをダウンロード",
        btn_save_cloud: "マイ編み図に保存",
        btn_save_cloud_done: "保存完了 ✓",
        btn_save_cloud_saving: "保存中...",
        save_login_required: "ログインして保存してください。",
        btn_select_file: "ファイルを選択",
        no_file_selected: "選択されたファイルはありません",
        result_title: "4. 生成された編み図",
        result_placeholder: "生成された編み図がここに表示されます。",
        history_title: "最近の履歴 (クリックで比較)",
        legend_title: "カラーチャート (糸番号)",
        status_loaded: "画像が読み込まれました. 設定を確認して生成してください。",
        status_generating: "編み図を生成中... 少々お待ちください。",
        status_done: "編み図の生成が完了しました！",
        status_error: "生成中にエラーが発生しました",
        status_format_err: "JPGまたはPNGファイルのみアップロード可能です。",
        status_size_err: "ファイルサイズが大きすぎます (最大10MB)。",
        status_pdf_err: "PDFライブラリを読み込めませんでした。しばらくしてからもう一度お試しください。",
        footer_about: "紹介",
        footer_terms: "利用規約",
        footer_privacy: "プライバシーポリシー",
        footer_guide: "ご利用案内",
        copyright_notice: "⚠️ 他者の写真・キャラクター・芸術作品から生成した編み図を商業目的で利用する場合、著作権法違反の責任はすべて利用者本人にあります。<a href='/privacy.html#disclaimer' aria-label='著作権免責事項の詳細を見る'>詳細を見る</a>",
        status_saved: "編み図が保存されました。",
        filet_upload_label: "1. 下絵画像をアップロード (任意)",
        filet_settings_title: "2. 方眼編み設定",
        label_grid_size: "グリッドサイズ (横 × 縦)",
        label_threshold: "画像変換しきい値",
        label_filet_gauge: "ゲージ (10x10cm基準)",
        label_filet_sts: "目数",
        label_filet_rows: "段数",
        filet_result_size: "完成予想サイズ",
        btn_convert_filet: "画像をグリッドに変換",
        btn_clear_grid: "グリッドを初期化",
        legend_filet: "凡例: ■ 埋め(長編み束), □ 空き(方眼)",
        label_filet_yarn_type: "糸の種類 (おおよその太さ)",
        preset_custom: "直接入力 (ゲージ)",
        preset_lace40: "極細レース糸 (#40)",
        preset_lace20: "レース糸 (#20)",
        preset_summer: "夏用コットン (かぎ針 0-2号)",
        preset_winter: "一般毛糸 (かぎ針 3-5号)",
        recommended: "おすすめ",
        label_show_symbols: "記号を表示",
        label_active_color: "編集色",
        tooltip_compare: "元の写真オーバーレイ表示切替",
        tooltip_pencil: "鉛筆 (描く)",
        tooltip_eraser: "消しゴム (背景色で塗る)",
        tooltip_picker: "色抽出 (スポイト)",
        tooltip_undo: "元に戻す (Ctrl+Z)",
        status_too_large: "コ/段の数が多すぎます。小さいサイズか太い糸を選んでください。",
        btn_modal_save: "保存",
        prompt_pdf_filename: "ファイル名を入力してください（.pdfは自動で追加されます）",
        save_error: "保存中にエラーが発生しました。",
        placeholder_pattern_title: "編み図名（必須、最大50文字）",
        btn_cancel: "キャンセル",
        modal_save_pattern_title: "編み図を保存",
        rec_click_hint: "クリックして適用",
    }
};

let currentLang = 'ko';

function changeLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('ssuessue_lang', lang);
    document.documentElement.lang = lang;
    const merged = { ...sharedT[lang], ...translations[lang] };
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (merged[key]) {
            el.innerHTML = merged[key];
        }
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (merged[key]) {
            el.setAttribute('title', merged[key]);
        }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (merged[key]) el.setAttribute('placeholder', merged[key]);
    });
    document.querySelectorAll('.i18n').forEach(el => {
        const val = el.getAttribute('data-' + lang);
        if (val) el.textContent = val;
    });
    // Handle special case for file name display which isn't data-i18n but updated dynamically
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    if (fileNameDisplay && (!imageUpload || !imageUpload.files || imageUpload.files.length === 0)) {
        fileNameDisplay.textContent = translations[lang].no_file_selected;
    }

    langBtns.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
}

langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang');
        if (lang) changeLanguage(lang);
    });
});

// 저장된 언어로 초기화 (기본값 한국어)
const savedLang = localStorage.getItem('ssuessue_lang');
changeLanguage(savedLang || 'ko');

// --- 실 굵기 입력 방식 전환 ---
yarnUnitRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        const isMm = e.target.value === 'mm';
        yarnNameGroup.style.display = isMm ? 'none' : 'flex';
        yarnMmGroup.style.display = isMm ? 'flex' : 'none';
    });
});

// --- 게이지 데이터 (10x10cm 기준 평균 코/단 수) ---
const gaugeData = {
    lace: { sts: 32, rows: 40 },
    fingering: { sts: 28, rows: 36 },
    dk: { sts: 22, rows: 28 },
    aran: { sts: 18, rows: 24 },
    chunky: { sts: 14, rows: 20 },
    super_bulky: { sts: 10, rows: 14 }
};

// mm 두께를 대략적인 게이지로 변환하는 함수
function getGaugeFromMm(mm) {
    const sts = Math.round(80 / (parseFloat(mm) + 0.5));
    const rows = Math.round(sts * 1.25); 
    return { sts, rows };
}

// 상태 메시지 표시 유틸리티
function showStatus(msgKey, isError = false) {
    const msg = translations[currentLang][msgKey] || msgKey;
    statusMessage.textContent = msg;
    statusMessage.style.color = isError ? '#ff0000' : '#000000';
}

// 초기화
generateBtn.disabled = true;
initAuth();

// --- 1. 이미지 업로드 처리 ---
imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    
    if (file) {
        if (fileNameDisplay) fileNameDisplay.textContent = file.name;
    } else {
        if (fileNameDisplay) fileNameDisplay.textContent = translations[currentLang].no_file_selected;
        return;
    }

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
        showStatus('status_format_err', true);
        return;
    }

    if (file.size > MAX_FILE_SIZE) {
        showStatus('status_size_err', true);
        e.target.value = ''; // Reset input
        if (fileNameDisplay) fileNameDisplay.textContent = translations[currentLang].no_file_selected;
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            
            // UI 상태 전환
            uploadPlaceholder.style.display = 'none';
            previewCanvas.style.display = 'block';
            generateBtn.disabled = false;
            
            // 프리뷰 캔버스에 그리기
            const maxPreviewWidth = window.innerWidth > 800 ? 800 : window.innerWidth - 60;
            let drawWidth = img.width;
            let drawHeight = img.height;
            if (drawWidth > maxPreviewWidth) {
                const ratio = maxPreviewWidth / drawWidth;
                drawWidth = maxPreviewWidth;
                drawHeight = img.height * ratio;
            }
            previewCanvas.width = drawWidth;
            previewCanvas.height = drawHeight;
            previewCtx.imageSmoothingEnabled = false; // Nearest-neighbor 유지
            previewCtx.drawImage(img, 0, 0, drawWidth, drawHeight);
            
            // 색상 추천 로직
            const recBadge = document.getElementById('colorRecommendation');
            if (recBadge) {
                const imageData = previewCtx.getImageData(0, 0, drawWidth, drawHeight);
                const pixels = getPixelArray(imageData, drawWidth, drawHeight);
                const recommended = detectOptimalColorCount(pixels, 20);
                const recText = translations[currentLang].recommended || "Recommended";
                recBadge.textContent = '';
                const recSpan = document.createElement('span');
                recSpan.className = 'recommendation-badge';
                recSpan.title = translations[currentLang]?.rec_click_hint || 'Click to apply';
                recSpan.textContent = `${recText}: ${recommended}`;
                recBadge.appendChild(recSpan);
                recBadge.style.cursor = 'pointer';
                recBadge.onclick = () => {
                    colorCountInput.value = recommended;
                };
            }
            
            // 결과 영역 초기화
            resultPlaceholder.style.display = 'block';
            canvas.style.display = 'none';
            colorLegend.innerHTML = '';
            patternInfo.textContent = '';
            downloadPdfBtn.disabled = true;
            
            // 상태 및 기록 초기화
            patternHistory = [];
            renderHistory();
            isPreviewMode = true;
            seedColors = [];
            renderSeedColors();
            showStatus('status_loaded', false);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

if (mainUploadWrapper) {
    mainUploadWrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
        mainUploadWrapper.classList.add('dragging');
    });
    mainUploadWrapper.addEventListener('dragleave', () => {
        mainUploadWrapper.classList.remove('dragging');
    });
    mainUploadWrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        mainUploadWrapper.classList.remove('dragging');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            imageUpload.files = e.dataTransfer.files;
            imageUpload.dispatchEvent(new Event('change'));
        }
    });
    // 배경 클릭 시에도 작동하도록 하되, 2중 트리거 방지
    mainUploadWrapper.addEventListener('click', (e) => {
        if (e.target.classList.contains('file-upload-btn') || e.target.tagName === 'LABEL') {
            return;
        }
        if (e.target !== imageUpload) {
            imageUpload.click();
        }
    });
}

// --- Seed Colors (필수 색상) 선택 및 돋보기 로직 (마우스/터치 호환) ---
const MAGNIFIER_SIZE = 140; 
const MAGNIFIER_ZOOM = 8;

magnifierCanvas.width = MAGNIFIER_SIZE;
magnifierCanvas.height = MAGNIFIER_SIZE;

let cachedRect = null;
function getCachedRect() {
    if (!cachedRect) {
        cachedRect = previewCanvas.getBoundingClientRect();
    }
    return cachedRect;
}
function resetCachedRect() { cachedRect = null; }
window.addEventListener('resize', resetCachedRect);
window.addEventListener('scroll', resetCachedRect);

function handlePointerMove(e) {
    if (!isPreviewMode || !originalImage) {
        magnifierCanvas.style.display = 'none';
        return;
    }

    let clientX, clientY;
    const isTouch = e.type.includes('touch');
    if (isTouch && e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
        if (e.cancelable) e.preventDefault(); 
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    const rect = getCachedRect();
    const scaleX = previewCanvas.width / rect.width;
    const scaleY = previewCanvas.height / rect.height;
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const cssX = clientX - rect.left;
    const cssY = clientY - rect.top;

    magnifierCanvas.style.display = 'block';
    
    const offsetX = - (MAGNIFIER_SIZE / 2);
    const offsetY = isTouch ? - MAGNIFIER_SIZE - 60 : - (MAGNIFIER_SIZE / 2);
    
    magnifierCanvas.style.left = `${cssX + previewCanvas.offsetLeft + offsetX}px`;
    magnifierCanvas.style.top = `${cssY + previewCanvas.offsetTop + offsetY}px`;

    magnifierCtx.clearRect(0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);
    magnifierCtx.save();
    
    const sWidth = MAGNIFIER_SIZE / MAGNIFIER_ZOOM;
    const sHeight = MAGNIFIER_SIZE / MAGNIFIER_ZOOM;
    const sx = x - (sWidth / 2);
    const sy = y - (sHeight / 2);

    magnifierCtx.imageSmoothingEnabled = false;
    magnifierCtx.drawImage(previewCanvas, sx, sy, sWidth, sHeight, 0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);

    magnifierCtx.strokeStyle = '#FF3B30';
    magnifierCtx.lineWidth = 2;
    magnifierCtx.beginPath();
    magnifierCtx.moveTo(MAGNIFIER_SIZE/2 - 10, MAGNIFIER_SIZE/2);
    magnifierCtx.lineTo(MAGNIFIER_SIZE/2 + 10, MAGNIFIER_SIZE/2);
    magnifierCtx.moveTo(MAGNIFIER_SIZE/2, MAGNIFIER_SIZE/2 - 10);
    magnifierCtx.lineTo(MAGNIFIER_SIZE/2, MAGNIFIER_SIZE/2 + 10);
    magnifierCtx.stroke();
    magnifierCtx.restore();
}

function handlePointerEnd(e) {
    if (!isPreviewMode || !originalImage) return;
    magnifierCanvas.style.display = 'none';

    let clientX, clientY;
    if (e.type === 'touchend') {
        if (e.cancelable) e.preventDefault();
        if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else return;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    const rect = previewCanvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (previewCanvas.width / rect.width);
    const y = (clientY - rect.top) * (previewCanvas.height / rect.height);
    
    if (x < 0 || y < 0 || x > previewCanvas.width || y > previewCanvas.height) return;

    const pixel = previewCtx.getImageData(x, y, 1, 1).data;
    if (pixel[3] > 128) { 
        seedColors.push([pixel[0], pixel[1], pixel[2]]);
        renderSeedColors();
    }
}

previewCanvas.addEventListener('mousemove', handlePointerMove);
previewCanvas.addEventListener('mouseleave', () => magnifierCanvas.style.display = 'none');
previewCanvas.addEventListener('click', handlePointerEnd);
previewCanvas.addEventListener('touchstart', handlePointerMove, { passive: false });
previewCanvas.addEventListener('touchmove', handlePointerMove, { passive: false });
previewCanvas.addEventListener('touchend', handlePointerEnd);

function renderSeedColors() {
    seedColorList.innerHTML = '';
    if (seedColors.length === 0) {
        const msg = translations[currentLang].no_colors_selected;
        seedColorList.innerHTML = `<li class="empty-msg">${msg}</li>`;
        clearSeedsBtn.style.display = 'none';
        return;
    }
    
    clearSeedsBtn.style.display = 'inline-block';
    seedColors.forEach((color, index) => {
        const hex = rgbToHex(color);
        const li = document.createElement('li');
        li.className = 'seed-color-item';
        const box = document.createElement('div');
        box.className = 'color-box removable-box';
        box.style.backgroundColor = hex;
        box.addEventListener('click', () => {
            seedColors.splice(index, 1);
            renderSeedColors();
        });
        li.appendChild(box);
        seedColorList.appendChild(li);
    });
}

clearSeedsBtn.addEventListener('click', () => {
    seedColors = [];
    renderSeedColors();
});


// --- 2. 도안 생성 로직 ---
generateBtn.addEventListener('click', async () => {
    if (!originalImage) return;

    generateBtn.disabled = true;
    showStatus('status_generating', false);

    const widthCm       = parseFloat(targetWidthInput.value);
    const isMmMode      = document.querySelector('input[name="yarnUnit"]:checked').value === 'mm';
    const yarnType      = yarnWeightSelect.value;
    const yarnMm        = yarnMmInput.value;
    const colorCount    = parseInt(colorCountInput.value, 10);
    const showGrid      = showGridCheckbox.checked;
    const techniqueRatio = parseFloat(techniqueRatioSelect.value);

    if (isNaN(widthCm) || widthCm < 10) {
        showStatus('status_error', true);
        generateBtn.disabled = false;
        return;
    }

    const gauge        = isMmMode ? getGaugeFromMm(yarnMm) : gaugeData[yarnType];
    const targetStitches = Math.round((widthCm / 10) * gauge.sts);
    const imgRatio     = originalImage.height / originalImage.width;
    const targetRows   = Math.round(targetStitches * imgRatio * techniqueRatio);

    if (targetStitches > 1500 || targetRows > 1500) {
        showStatus('status_too_large', true);
        generateBtn.disabled = false;
        return;
    }

    await new Promise(res => setTimeout(res, 50));

    try {
        const cols  = targetStitches;
        const rows  = targetRows;

        // --- 1. 대비 및 윤곽선 강조 값 ---
        const contrastVal = 120; // 사용자 설정 제거 및 120% 기본값 유지
        
        // 스캔용 고해상도 캔버스 준비
        const SCAN_MAX = 2000;
        const origW = originalImage.width;
        const origH = originalImage.height;
        const scanScale = Math.min(1, SCAN_MAX / Math.max(origW, origH));
        const scanW = Math.round(origW * scanScale);
        const scanH = Math.round(origH * scanScale);

        const scanCanvas = document.createElement('canvas');
        scanCanvas.width  = scanW;
        scanCanvas.height = scanH;
        const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });
        
        // 캔버스 필터 적용 (대비 및 채도 증폭으로 피사체/배경 분리도 극대화)
        scanCtx.filter = `contrast(${contrastVal}%) saturate(${Math.max(100, contrastVal * 0.9)}%)`;
        scanCtx.imageSmoothingEnabled = true;
        scanCtx.drawImage(originalImage, 0, 0, scanW, scanH);

        const scanData = scanCtx.getImageData(0, 0, scanW, scanH).data;

        // --- 2. 배경색 모서리 감지 알고리즘 ---
        const getPixelColor = (x, y) => {
            const i = (y * scanW + x) * 4;
            return [scanData[i], scanData[i+1], scanData[i+2]];
        };
        const corners = [
            getPixelColor(0, 0),
            getPixelColor(scanW-1, 0),
            getPixelColor(0, scanH-1),
            getPixelColor(scanW-1, scanH-1)
        ];
        let bgR = 0, bgG = 0, bgB = 0;
        corners.forEach(c => { bgR+=c[0]; bgG+=c[1]; bgB+=c[2]; });
        const bgColor = [bgR/4, bgG/4, bgB/4];

        const colorDist = (c1, c2) => Math.abs(c1[0]-c2[0]) + Math.abs(c1[1]-c2[1]) + Math.abs(c1[2]-c2[2]);
        const BG_DISTANCE_THRESHOLD = 40; // 배경으로 간주할 최대 거리

        // --- 3. 지분율 10% 필터링 (Threshold Mode Downsampling) ---
        const cellScaleX = scanW / cols;
        const cellScaleY = scanH / rows;
        let gridColors = [];

        for (let gy = 0; gy < rows; gy++) {
            for (let gx = 0; gx < cols; gx++) {
                const x0 = Math.floor(gx * cellScaleX);
                const x1 = Math.min(Math.ceil((gx + 1) * cellScaleX), scanW);
                const y0 = Math.floor(gy * cellScaleY);
                const y1 = Math.min(Math.ceil((gy + 1) * cellScaleY), scanH);

                let validPixels = 0;
                const counts = new Map();

                // 1. 셀 내의 색상을 양자화(노이즈 병합)하여 빈도수 조사
                for (let py = y0; py < y1; py++) {
                    for (let px = x0; px < x1; px++) {
                        const si = (py * scanW + px) * 4;
                        if (scanData[si + 3] < 128) continue;

                        validPixels++;
                        const r = scanData[si], g = scanData[si+1], b = scanData[si+2];
                        const key = (Math.round(r/8)*8) + ',' + (Math.round(g/8)*8) + ',' + (Math.round(b/8)*8);
                        
                        if (!counts.has(key)) {
                            counts.set(key, { c: [r, g, b], count: 0 });
                        }
                        counts.get(key).count++;
                    }
                }

                // 2. 전체 픽셀의 10% 미만을 차지하는 색상(번짐 찌꺼기)은 철저히 무시
                const THRESHOLD_COUNT = validPixels * 0.1;
                let maxDist = -1;
                let candidateColor = bgColor;

                for (let val of counts.values()) {
                    if (val.count >= THRESHOLD_COUNT) {
                        const dist = colorDist(val.c, bgColor);
                        if (dist > maxDist) {
                            maxDist = dist;
                            candidateColor = val.c;
                        }
                    }
                }

                // 3. 만약 10%를 넘으면서 배경보다 확연히 다른 색상이 선택되었다면 적용, 아니면 배경 처리
                if (validPixels > 0 && maxDist > BG_DISTANCE_THRESHOLD) {
                    gridColors.push(candidateColor);
                } else if (validPixels > 0) {
                    gridColors.push([Math.round(bgColor[0]), Math.round(bgColor[1]), Math.round(bgColor[2])]);
                } else {
                    gridColors.push([255, 255, 255]);
                }
            }
        }

        // --- 4. 노이즈 스무딩 처리 (UI 체크박스) ---
        const smoothingCheckbox = document.getElementById('applySmoothing');
        const applyPatternSmoothing = smoothingCheckbox ? smoothingCheckbox.checked : false;
        
        if (applyPatternSmoothing) {
            const smoothedColors = [];
            for (let gy = 0; gy < rows; gy++) {
                for (let gx = 0; gx < cols; gx++) {
                    let sumR = 0, sumG = 0, sumB = 0, totalNeighbors = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const ny = gy + dy, nx = gx + dx;
                            if (ny >= 0 && ny < rows && nx >= 0 && nx < cols) {
                                const nc = gridColors[ny * cols + nx];
                                sumR += nc[0]; sumG += nc[1]; sumB += nc[2];
                                totalNeighbors++;
                            }
                        }
                    }
                    smoothedColors.push([
                        Math.round(sumR / totalNeighbors),
                        Math.round(sumG / totalNeighbors),
                        Math.round(sumB / totalNeighbors)
                    ]);
                }
            }
            gridColors = smoothedColors;
        }

        // --- 5. K-Means 색상 양자화 ---
        const allPixels = [];
        for (let gy = 0; gy < rows; gy++) {
            for (let gx = 0; gx < cols; gx++) {
                const c = gridColors[gy * cols + gx];
                allPixels.push([c[0], c[1], c[2], gx, gy]);
            }
        }

        let palette = [];
        if (allPixels.length > 0) {
            const effectiveK = Math.min(colorCount, allPixels.length);
            const { palette: rawPalette, assignments: rawAssign } =
                kMeans(allPixels, effectiveK, cols, rows, 15, seedColors);
            const { palette: mergedPalette } =
                mergeByDeltaE(rawPalette, rawAssign, seedColors, 15);
            palette = mergedPalette;
        }
        if (palette.length === 0) palette.push([200, 200, 200]);

        // --- 6. 최종 팔레트 매칭 ---
        const legendPalette = palette;
        
        const finalAssignments = gridColors.map(c => {
            let minD = Infinity, minI = 0;
            for (let ci = 0; ci < palette.length; ci++) {
                const p  = palette[ci];
                const dr = c[0] - p[0], dg = c[1] - p[1], db = c[2] - p[2];
                const d  = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
                if (d < minD) { minD = d; minI = ci; }
            }
            return minI;
        });
        // --- 7. 데이터 저장 및 도안 그리기 ──────────────────
        let pixelSize = Math.max(8, Math.min(20, Math.floor(800 / cols)));
        if (cols * pixelSize > MAX_CANVAS_DIMENSION || rows * pixelSize > MAX_CANVAS_DIMENSION) {
            pixelSize = Math.floor(MAX_CANVAS_DIMENSION / Math.max(cols, rows));
        }

        currentPatternData = {
            cols, rows, pixelSize, 
            palette: legendPalette, 
            assignments: finalAssignments,
            showGrid,
            gauge
        };

        // Determine initial background index for reference (though eraser uses white now)
        bgIndex = detectBgIndex(legendPalette);

        if (editToolbar) editToolbar.style.display = 'flex';
        renderPattern();

        resultPanel.style.display    = 'block';
        resultPlaceholder.style.display = 'none';
        canvas.style.display         = 'block';

        const calcHeightCm = ((rows / gauge.rows) * 10).toFixed(1);
        patternInfo.textContent =
            `${cols} Stitches x ${rows} Rows (approx. ${widthCm}cm x ${calcHeightCm}cm)`;
        updateLegend(legendPalette);

        showStatus('status_done', false);
        downloadPdfBtn.disabled = false;
        saveToCloudBtn.disabled = false;
        saveToCloudBtn.textContent =
            translations[currentLang]?.btn_save_cloud || '\ub0b4 \ub3c4\uc548\uc5d0 \uc800\uc7a5';
        
        saveToHistory(canvas.toDataURL('image/png'), legendPalette, patternInfo.textContent);
        
        // 원본 비교용 캔버스 업데이트
        if (compareCanvas && compareCtx && originalImage) {
            compareCanvas.width = canvas.width;
            compareCanvas.height = canvas.height;
            compareCtx.clearRect(0, 0, compareCanvas.width, compareCanvas.height);
            
            // patternCanvas와 동일한 오프셋 및 크기로 원본 이미지 렌더링
            const { cols, rows, pixelSize, showGrid } = currentPatternData;
            const paddingTop = showGrid ? 40 : 10;
            const paddingLeft = showGrid ? 40 : 10;
            
            compareCtx.save();
            compareCtx.translate(paddingLeft, paddingTop);
            compareCtx.imageSmoothingEnabled = true;
            compareCtx.globalAlpha = 0.5;
            compareCtx.drawImage(originalImage, 0, 0, cols * pixelSize, rows * pixelSize);
            compareCtx.restore();

            if (isOverlayVisible) showOverlay();
        }

        resultPanel.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error(error);
        showStatus('status_error', true);
    } finally {
        generateBtn.disabled = false;
    }
});



function renderPattern() {
    if (!currentPatternData || !canvas || !ctx) return;
    const { cols, rows, pixelSize, palette, assignments, showGrid } = currentPatternData;

    // Ensure canvas is visible before drawing
    canvas.style.display = 'block';

    const paddingTop    = showGrid ? 40 : 10;
    const paddingRight  = showGrid ? 60 : 10;
    const paddingBottom = showGrid ? 60 : 10;
    const paddingLeft   = showGrid ? 40 : 10;

    const targetW = cols * pixelSize + paddingLeft + paddingRight;
    const targetH = rows * pixelSize + paddingTop + paddingBottom;

    if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width  = targetW;
        canvas.height = targetH;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(paddingLeft, paddingTop);

    for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
            const palIdx = assignments[gy * cols + gx];
            const color = palIdx !== -1 ? (palette[palIdx] || palette[0]) : null;

            if (palIdx === -1) {
                // 지우개로 지운 자리 (순백색)
                ctx.fillStyle = '#ffffff';
            } else {
                ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
            }
            ctx.fillRect(gx * pixelSize, gy * pixelSize, pixelSize, pixelSize);

            if (showSymbols && palIdx !== -1 && color) {
                const brightness = (color[0] * 299 + color[1] * 587 + color[2] * 114) / 1000;
                ctx.fillStyle = brightness > 128 ? '#000000' : '#ffffff';
                ctx.font = `bold ${Math.floor(pixelSize * 0.6)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const symbol = getSymbolForIndex(palIdx);
                ctx.fillText(symbol, gx * pixelSize + pixelSize / 2, gy * pixelSize + pixelSize / 2 + 1);
            }
        }
    }

    if (showGrid) drawGridWithLabels(cols, rows, pixelSize);
    ctx.restore();
}

// PDF 전용 고해상도 렌더링 (기호가 충분히 크게 출력되도록 pixelSize를 강제 확대)
function renderPatternForPdf() {
    if (!currentPatternData) return canvas;
    const { cols, rows, palette, assignments, showGrid } = currentPatternData;

    const PDF_MIN_PIXEL = 28; // 기호가 선명하게 보이는 최소 셀 크기
    const pdfPixelSize = Math.max(PDF_MIN_PIXEL, currentPatternData.pixelSize);
    const PDF_LABEL_FONT = 20; // 그리드 좌표 폰트 크기 (px)

    const paddingTop    = showGrid ? 60 : 10;
    const paddingRight  = showGrid ? 80 : 10;
    const paddingBottom = showGrid ? 80 : 10;
    const paddingLeft   = showGrid ? 60 : 10;

    const offCanvas = document.createElement('canvas');
    offCanvas.width  = cols * pdfPixelSize + paddingLeft + paddingRight;
    offCanvas.height = rows * pdfPixelSize + paddingTop  + paddingBottom;
    const offCtx = offCanvas.getContext('2d');

    offCtx.fillStyle = '#ffffff';
    offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);
    offCtx.save();
    offCtx.translate(paddingLeft, paddingTop);

    for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
            const palIdx = assignments[gy * cols + gx];
            const color = palIdx !== -1 ? (palette[palIdx] || palette[0]) : null;

            offCtx.fillStyle = palIdx === -1 ? '#ffffff' : `rgb(${color[0]},${color[1]},${color[2]})`;
            offCtx.fillRect(gx * pdfPixelSize, gy * pdfPixelSize, pdfPixelSize, pdfPixelSize);

            if (showSymbols && palIdx !== -1 && color) {
                const brightness = (color[0] * 299 + color[1] * 587 + color[2] * 114) / 1000;
                offCtx.fillStyle = brightness > 128 ? '#000000' : '#ffffff';
                offCtx.font = `bold ${Math.floor(pdfPixelSize * 0.65)}px sans-serif`;
                offCtx.textAlign = 'center';
                offCtx.textBaseline = 'middle';
                offCtx.fillText(
                    getSymbolForIndex(palIdx),
                    gx * pdfPixelSize + pdfPixelSize / 2,
                    gy * pdfPixelSize + pdfPixelSize / 2 + 1
                );
            }
        }
    }

    // 그리드 선 (간소화 버전)
    if (showGrid) {
        offCtx.strokeStyle = 'rgba(0,0,0,0.15)';
        offCtx.lineWidth = 1;
        for (let x = 0; x <= cols; x++) { offCtx.beginPath(); offCtx.moveTo(x*pdfPixelSize,0); offCtx.lineTo(x*pdfPixelSize,rows*pdfPixelSize); offCtx.stroke(); }
        for (let y = 0; y <= rows; y++) { offCtx.beginPath(); offCtx.moveTo(0,y*pdfPixelSize); offCtx.lineTo(cols*pdfPixelSize,y*pdfPixelSize); offCtx.stroke(); }
        offCtx.strokeStyle = 'rgba(0,0,0,0.7)';
        offCtx.lineWidth = 2;
        for (let x = cols; x >= 0; x -= 10) { offCtx.beginPath(); offCtx.moveTo(x*pdfPixelSize,0); offCtx.lineTo(x*pdfPixelSize,rows*pdfPixelSize); offCtx.stroke(); }
        for (let y = rows; y >= 0; y -= 10) { offCtx.beginPath(); offCtx.moveTo(0,y*pdfPixelSize); offCtx.lineTo(cols*pdfPixelSize,y*pdfPixelSize); offCtx.stroke(); }
        offCtx.strokeRect(0, 0, cols*pdfPixelSize, rows*pdfPixelSize);
        offCtx.fillStyle = '#334155';
        offCtx.font = `bold ${PDF_LABEL_FONT}px sans-serif`;
        offCtx.textAlign = 'left'; offCtx.textBaseline = 'middle';
        for (let y = rows; y >= 0; y -= 10) { offCtx.fillText(rows-y, cols*pdfPixelSize+10, y*pdfPixelSize); }
        offCtx.textAlign = 'center'; offCtx.textBaseline = 'top';
        for (let x = cols; x >= 0; x -= 10) { offCtx.fillText(cols-x, x*pdfPixelSize, rows*pdfPixelSize+10); }
    }

    offCtx.restore();
    return offCanvas;
}

function drawGridWithLabels(cols, rows, cellSize) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'; 
    ctx.lineWidth = 1;
    for (let x = 0; x <= cols; x++) { ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, rows * cellSize); ctx.stroke(); }
    for (let y = 0; y <= rows; y++) { ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(cols * cellSize, y * cellSize); ctx.stroke(); }
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)'; 
    ctx.lineWidth = 2;
    for (let x = cols; x >= 0; x -= 10) { ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, rows * cellSize); ctx.stroke(); }
    for (let y = rows; y >= 0; y -= 10) { ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(cols * cellSize, y * cellSize); ctx.stroke(); }
    
    ctx.strokeRect(0, 0, cols * cellSize, rows * cellSize);
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let y = rows; y >= 0; y -= 10) { ctx.fillText(rows - y, cols * cellSize + 8, y * cellSize); }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let x = cols; x >= 0; x -= 10) { ctx.fillText(cols - x, x * cellSize, rows * cellSize + 8); }
}

// 기호 라이브러리 (도안에서 구분하기 쉬운 문단 기호 위주)
const SYMBOLS = [' ', 'X', 'O', '/', '\\', 'V', 'T', '+', '-', '*', '#', '@', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'P', 'Q', 'U', 'W', 'M', 'N'];

function getSymbolForIndex(index) {
    return SYMBOLS[index % SYMBOLS.length];
}

function detectBgIndex(palette) {
    if (!palette || palette.length === 0) return 0;
    // 가장 밝은 색상(L 수치가 큰 것)을 배경색으로 간주
    let maxBrightness = -1;
    let bestIdx = 0;
    palette.forEach((color, i) => {
        const brightness = (color[0] * 299 + color[1] * 587 + color[2] * 114) / 1000;
        if (brightness > maxBrightness) {
            maxBrightness = brightness;
            bestIdx = i;
        }
    });
    return bestIdx;
}

function updateLegend(palette) {
    if (!colorLegend) return;
    colorLegend.innerHTML = '';
    
    // 상단 툴바 팔레트 업데이트
    if (toolbarPalette) {
        toolbarPalette.innerHTML = '';
        palette.forEach((color, index) => {
            const hex = rgbToHex(color);
            const li = document.createElement('li');
            li.className = 'color-item' + (index === activeColorIndex ? ' active' : '');
            li.style.backgroundColor = hex;
            li.title = `No.${index + 1} (${hex})`;

            // 기호 표시 (밝기에 따라 텍스트 색상 결정)
            const sym = document.createElement('span');
            sym.className = 'color-box-symbol';
            sym.textContent = getSymbolForIndex(index);
            sym.style.fontSize = '12px';
            sym.style.fontWeight = '900';
            const brightness = (color[0] * 299 + color[1] * 587 + color[2] * 114) / 1000;
            sym.style.color = brightness > 128 ? '#000' : '#fff';
            li.appendChild(sym);

            li.addEventListener('click', () => {
                activeColorIndex = index;
                document.querySelectorAll('#toolbarPalette .color-item').forEach(el => el.classList.remove('active'));
                li.classList.add('active');
                setTool('pencil');
            });
            toolbarPalette.appendChild(li);
        });
    }

    // 하단 상세 범례 업데이트 (정보 표시 전용 — 클릭 불필요)
    palette.forEach((color, index) => {
        const hex = rgbToHex(color);
        const li = document.createElement('li');
        li.className = 'color-item';

        const box = document.createElement('div');
        box.className = 'color-box';
        box.style.backgroundColor = hex;
        box.style.position = 'relative';

        const sym = document.createElement('span');
        sym.textContent = getSymbolForIndex(index);
        sym.className = 'color-box-symbol';
        sym.style.position = 'absolute';
        sym.style.top = '50%';
        sym.style.left = '50%';
        sym.style.transform = 'translate(-50%, -50%)';
        sym.style.fontSize = '12px';
        sym.style.fontWeight = '900';
        const brightness = (color[0] * 299 + color[1] * 587 + color[2] * 114) / 1000;
        sym.style.color = brightness > 128 ? '#000' : '#fff';
        box.appendChild(sym);

        const text = document.createElement('span');
        text.textContent = `No.${index + 1} (${hex})`;

        li.appendChild(box);
        li.appendChild(text);
        colorLegend.appendChild(li);
    });
    updateActiveColorUI();
}

function updateActiveColorUI() {
    if (!currentPatternData || !activeColorBox) return;
    
    if (activeTool === 'eraser') {
        // 지우개 도구 활성 시 시각적 표시 (빨간 슬래시 패턴)
        activeColorBox.style.backgroundColor = 'transparent';
        activeColorBox.classList.add('active-color-eraser');
        if (activeColorDisplay) activeColorDisplay.style.opacity = '1';
    } else {
        const color = currentPatternData.palette[activeColorIndex];
        activeColorBox.classList.remove('active-color-eraser');
        if (color) {
            activeColorBox.style.backgroundColor = rgbToHex(color);
            if (activeColorDisplay) activeColorDisplay.style.opacity = (activeTool === 'pencil') ? '1' : '0.4';
        }
    }
}

// ── 툴바 및 인터랙션 로직 ──────────────────────────────────────
function setTool(tool) {
    activeTool = tool;
    const btns = [viewToolBtn, pencilToolBtn, eraserToolBtn, pickerToolBtn];
    btns.forEach(btn => {
        if (btn) btn.classList.toggle('active', btn.id.startsWith(tool));
    });

    // 캔버스 커서 업데이트
    if (canvas) {
        canvas.classList.remove('cursor-pencil', 'cursor-eraser', 'cursor-picker');
        if (tool !== 'view') canvas.classList.add(`cursor-${tool}`);
    }

    // 지우개 선택 시 팔레트 선택 해제 (시각적 피드백)
    if (tool === 'eraser') {
        document.querySelectorAll('#toolbarPalette .color-item').forEach(el => el.classList.remove('active'));
    } else if (tool === 'pencil') {
        document.querySelectorAll('#toolbarPalette .color-item').forEach((el, i) => {
            el.classList.toggle('active', i === activeColorIndex);
        });
    }

    updateActiveColorUI();
}

if (viewToolBtn) viewToolBtn.addEventListener('click', () => setTool('view'));
if (pencilToolBtn) pencilToolBtn.addEventListener('click', () => setTool('pencil'));
if (eraserToolBtn) eraserToolBtn.addEventListener('click', () => setTool('eraser'));
if (pickerToolBtn) pickerToolBtn.addEventListener('click', () => setTool('picker'));

// 원본 오버레이 토글 기능
function syncOverlayPosition() {
    if (!canvas || !compareCanvas) return;
    compareCanvas.style.top = canvas.offsetTop + 'px';
    compareCanvas.style.left = canvas.offsetLeft + 'px';
    compareCanvas.style.width = canvas.offsetWidth + 'px';
    compareCanvas.style.height = canvas.offsetHeight + 'px';
    compareCanvas.style.transform = 'none';
}

function showOverlay() {
    syncOverlayPosition();
    compareCanvas.style.display = 'block';
    void compareCanvas.offsetWidth;
    compareCanvas.style.opacity = '1';
    compareToolBtn.classList.add('active');
    isOverlayVisible = true;
}

function hideOverlay() {
    compareCanvas.style.opacity = '0';
    setTimeout(() => {
        if (compareCanvas.style.opacity === '0') compareCanvas.style.display = 'none';
    }, 160);
    compareToolBtn.classList.remove('active');
    isOverlayVisible = false;
}

if (compareToolBtn && compareCanvas) {
    compareToolBtn.addEventListener('click', () => {
        if (!originalImage) {
            showStatus('status_no_original', true);
            return;
        }
        if (isOverlayVisible) {
            hideOverlay();
        } else {
            showOverlay();
        }
    });
}

// 되돌리기 로직
function saveEditState() {
    if (!currentPatternData) return;
    editHistory.push([...currentPatternData.assignments]);
    if (editHistory.length > MAX_EDIT_HISTORY) editHistory.shift();
}

function undoEdit() {
    if (editHistory.length === 0) return;
    currentPatternData.assignments = editHistory.pop();
    renderPattern();
}

if (undoBtn) undoBtn.addEventListener('click', undoEdit);

// 키보드 단축키 (Ctrl+Z)
window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (activeTool !== 'view') {
            e.preventDefault();
            undoEdit();
        }
    }
});

if (toggleSymbols) {
    toggleSymbols.addEventListener('change', (e) => {
        showSymbols = e.target.checked;
        renderPattern();
    });
}

function handleCanvasEdit(e) {
    if (activeTool === 'view' || !currentPatternData || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const { cols, rows, pixelSize, showGrid } = currentPatternData;
    const paddingTop    = showGrid ? 40 : 10;
    const paddingLeft   = showGrid ? 40 : 10;
    
    const x = (e.clientX - rect.left) * (canvas.width / rect.width) - paddingLeft;
    const y = (e.clientY - rect.top) * (canvas.height / rect.height) - paddingTop;

    // Use a small safety margin for floating point math
    const gx = Math.floor(x / pixelSize + 0.001);
    const gy = Math.floor(y / pixelSize + 0.001);

    if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
        const idx = gy * cols + gx;
        if (activeTool === 'pencil' || activeTool === 'eraser') {
            const targetColorIdx = activeTool === 'eraser' ? -1 : activeColorIndex;
            if (currentPatternData.assignments[idx] !== targetColorIdx) {
                currentPatternData.assignments[idx] = targetColorIdx;
                renderPattern();
                // 편집 후 재저장 활성화
                if (saveToCloudBtn && saveToCloudBtn.disabled) {
                    saveToCloudBtn.disabled = false;
                    saveToCloudBtn.textContent = translations[currentLang]?.btn_save_cloud || '내 도안에 저장';
                }
            }
        } else if (activeTool === 'picker') {
            const pickedColorIdx = currentPatternData.assignments[idx];
            if (pickedColorIdx !== -1) {
                activeColorIndex = pickedColorIdx;
                setTool('pencil');
            }
        }
    }
}

if (canvas) {
    canvas.addEventListener('pointerdown', (e) => {
        if (activeTool === 'view') return;
        
        // Ensure touch gestures don't scroll the page
        if (e.pointerType === 'touch') {
            canvas.releasePointerCapture(e.pointerId); // Let pointer events flow
        }
        
        // Capture the pointer to keep receiving events even if moved outside
        canvas.setPointerCapture(e.pointerId);

        if (activeTool === 'pencil' || activeTool === 'eraser') {
            saveEditState();
        }
        
        handleCanvasEdit(e);

        const moveHandler = (me) => {
            // Prevent default touch actions like scrolling
            if (me.pointerType === 'touch') me.preventDefault();
            handleCanvasEdit(me);
        };

        const upHandler = (ue) => {
            canvas.releasePointerCapture(ue.pointerId);
            window.removeEventListener('pointermove', moveHandler);
            window.removeEventListener('pointerup', upHandler);
            window.removeEventListener('pointercancel', upHandler);
        };

        window.addEventListener('pointermove', moveHandler);
        window.addEventListener('pointerup', upHandler);
        window.addEventListener('pointercancel', upHandler);
    });
}

function saveToHistory(dataURL, palette, infoText) {
    const id = Date.now();
    if (!currentPatternData) { renderHistory(); return; }
    const { cols, rows, pixelSize, showGrid, gauge } = currentPatternData;
    const assignments = [...currentPatternData.assignments];
    
    // 원본 이미지를 데이터 URL로 저장하여 히스토리 전환 시에도 비교 기능 유지
    const originalDataURL = (originalImage && originalImage.src) ? originalImage.src : null;
    
    patternHistory.push({ 
        id, dataURL, palette, infoText, assignments, 
        cols, rows, pixelSize, showGrid, gauge,
        originalDataURL 
    });
    if (patternHistory.length > 5) patternHistory.shift();
    renderHistory();
}

function renderHistory() {
    if (patternHistory.length <= 1) { historyPanel.style.display = 'none'; return; }
    historyPanel.style.display = 'block';
    historyThumbnails.innerHTML = '';
    patternHistory.forEach((item, index) => {
        const img = document.createElement('img');
        img.src = item.dataURL;
        img.className = 'history-item' + (index === patternHistory.length - 1 ? ' active' : '');
        img.addEventListener('click', () => {
            // Restore currentPatternData when switching history
            currentPatternData = {
                ...currentPatternData,
                palette: item.palette,
                assignments: [...(item.assignments || [])],
                cols: item.cols ?? currentPatternData?.cols,
                rows: item.rows ?? currentPatternData?.rows,
                pixelSize: item.pixelSize ?? currentPatternData?.pixelSize,
                showGrid: item.showGrid ?? currentPatternData?.showGrid,
                gauge: item.gauge ?? currentPatternData?.gauge,
            };
            
            const tempImg = new Image();
            tempImg.onload = () => {
                canvas.width = tempImg.width;
                canvas.height = tempImg.height;
                ctx.drawImage(tempImg, 0, 0);
            };
            tempImg.src = item.dataURL;
            updateLegend(item.palette);
            // 배경색 인덱스 재설정
            bgIndex = detectBgIndex(item.palette);
            
            patternInfo.textContent = item.infoText;
            document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
            img.classList.add('active');

            // 히스토리 항목의 원본 이미지 복구 (비교 기능용)
            if (item.originalDataURL) {
                const tempOrigImg = new Image();
                tempOrigImg.onload = () => {
                    originalImage = tempOrigImg;
                    // compareCanvas 업데이트
                    if (compareCanvas && compareCtx) {
                        compareCanvas.width = canvas.width;
                        compareCanvas.height = canvas.height;
                        compareCtx.clearRect(0, 0, compareCanvas.width, compareCanvas.height);
                        const paddingTop = item.showGrid ? 40 : 10;
                        const paddingLeft = item.showGrid ? 40 : 10;
                        compareCtx.save();
                        compareCtx.translate(paddingLeft, paddingTop);
                        compareCtx.imageSmoothingEnabled = true;
                        compareCtx.globalAlpha = 0.5;
                        compareCtx.drawImage(originalImage, 0, 0, item.cols * item.pixelSize, item.rows * item.pixelSize);
                        compareCtx.restore();
                    }
                };
                tempOrigImg.src = item.originalDataURL;
            }
        });
        historyThumbnails.appendChild(img);
    });
}

downloadPdfBtn.addEventListener('click', async () => {
    try {
        if (typeof window.jspdf === 'undefined') {
            showStatus('status_pdf_err', true);
            return;
        }

        // 1. 파일명(=도안 이름) 먼저 입력받기
        const infoRaw = patternInfo.textContent || '';
        const numbers = infoRaw.match(/\d+(\.\d+)?/g);
        const defaultName = (numbers && numbers.length >= 4)
            ? `knitting_pattern_${numbers[2]}cm`
            : 'knitting_pattern';
        const filename = window.prompt(translations[currentLang]?.prompt_pdf_filename || '저장할 파일 이름을 입력하세요 (.pdf 자동 추가)', defaultName);
        if (filename === null) return;
        const finalName = filename.trim() || defaultName;

        // 2. PDF 생성
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pdfWidth  = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const maxW = pdfWidth - margin * 2;

        // 3. 제목: 고정 크기 캔버스 렌더링 (한국어 포함 모든 문자 지원)
        await document.fonts.ready; // 한글 웹폰트 로드 완료 대기
        const scale = 4;
        const titleCanvas = document.createElement('canvas');
        titleCanvas.width  = 1200 * scale;
        titleCanvas.height = 60 * scale;
        const tCtx = titleCanvas.getContext('2d');
        tCtx.fillStyle = '#ffffff'; // 흰 배경 먼저 채우기 (투명 배경 깨짐 방지)
        tCtx.fillRect(0, 0, titleCanvas.width, titleCanvas.height);
        tCtx.font = `bold ${32 * scale}px sans-serif`;
        tCtx.fillStyle = '#000000';
        tCtx.fillText(finalName, 20 * scale, 45 * scale);
        const titleH = maxW * 60 / 1200;
        pdf.addImage(titleCanvas.toDataURL('image/png'), 'PNG', margin, margin, maxW, titleH);

        // 4. 도안 정보 (코수/단수/크기/실 굵기) — ASCII 전용이므로 pdf.text() 사용
        const isMmModeNow = document.querySelector('input[name="yarnUnit"]:checked')?.value === 'mm';
        let yarnSuffix = '';
        if (isMmModeNow && yarnMmInput.value) {
            yarnSuffix = ` · ${yarnMmInput.value}mm`;
        } else if (!isMmModeNow && yarnWeightSelect.value) {
            yarnSuffix = ` · ${yarnWeightSelect.value}`;
        }
        if (numbers && numbers.length >= 4) {
            const infoLine = `${numbers[0]} Stitches x ${numbers[1]} Rows (${numbers[2]}cm x ${numbers[3]}cm)${yarnSuffix}`;
            pdf.setFontSize(14);
            pdf.text(infoLine, margin, margin + titleH + 8);
        }

        // 5. 도안 이미지 (기호 표시 시 고해상도 오프스크린 캔버스 사용)
        const pdfPatternCanvas = renderPatternForPdf();
        const imgData = pdfPatternCanvas.toDataURL('image/png');
        const imgY  = margin + titleH + 18;
        const maxH  = pdfHeight - imgY - margin;
        let finalW  = maxW;
        let finalH  = (pdfPatternCanvas.height / pdfPatternCanvas.width) * finalW;
        if (finalH > maxH) { finalH = maxH; finalW = (pdfPatternCanvas.width / pdfPatternCanvas.height) * finalH; }
        pdf.addImage(imgData, 'PNG', margin, imgY, finalW, finalH);

        // 6. 2페이지: 색상표 (currentPatternData.palette에서 직접 읽어 DOM 의존성 제거)
        pdf.addPage();
        pdf.setFontSize(12);
        pdf.text('Color Legend', margin, margin + 5);
        let currentY = margin + 15;
        let currentX = margin;
        if (currentPatternData) {
            currentPatternData.palette.forEach((color, index) => {
                const [r, g, b] = color;
                const hex = rgbToHex(color);
                pdf.setFillColor(r, g, b);
                pdf.rect(currentX, currentY, 8, 8, 'F');
                pdf.setDrawColor(0);
                pdf.rect(currentX, currentY, 8, 8, 'S');

                const sym = getSymbolForIndex(index);
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                pdf.setTextColor(brightness > 128 ? 0 : 255);
                pdf.setFontSize(6);
                pdf.text(sym, currentX + 4, currentY + 5.5, { align: 'center' });
                pdf.setTextColor(0);

                pdf.setFontSize(10);
                pdf.text(`No.${index + 1} (${hex})`, currentX + 12, currentY + 6);
                currentY += 12;
                if (currentY > pdfHeight - margin) { currentY = margin + 15; currentX += 65; }
            });
        }

        pdf.save(`${finalName}.pdf`);
    } catch (e) {
        showStatus('status_error', true);
    }
});

// 저장 버튼 → 모달 오픈
saveToCloudBtn.addEventListener('click', () => {
    const user = getCurrentUser();
    if (!user) {
        showLoginRequiredToast();
        setOnAuthComplete(() => saveToCloudBtn.click());
        setTimeout(() => openAuthModal(), 300);
        return;
    }
    document.getElementById('patternSaveModal').style.display = 'flex';
    document.getElementById('patternTitleInput').value = lastSavedTitle || '';

    document.getElementById('patternSaveError').style.display = 'none';
    document.getElementById('patternSaveModalSubmit').disabled = false;
    document.getElementById('patternSaveModalSubmit').textContent = translations[currentLang]?.btn_modal_save || '저장';
});

const saveModalClose = document.getElementById('patternSaveModalClose');
if (saveModalClose) {
    saveModalClose.addEventListener('click', () => {
        const modal = document.getElementById('patternSaveModal');
        if (modal) modal.style.display = 'none';
    });
}

const saveModalCancel = document.getElementById('patternSaveModalCancel');
if (saveModalCancel) {
    saveModalCancel.addEventListener('click', () => {
        const modal = document.getElementById('patternSaveModal');
        if (modal) modal.style.display = 'none';
    });
}

document.getElementById('patternSaveForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) { showStatus('save_login_required', true); return; }

    const title = document.getElementById('patternTitleInput').value.trim();
    if (!title) return;
    const submitBtn = document.getElementById('patternSaveModalSubmit');
    const errorEl = document.getElementById('patternSaveError');

    // 같은 제목으로 저장 시 덮어쓰기 확인
    const overwriteDocId = (title === lastSavedTitle && lastSavedDocId) ? lastSavedDocId : null;
    if (title === lastSavedTitle && lastSavedDocId) {
        const confirmed = window.confirm(`"${title}" 도안이 이미 저장되어 있습니다. 덮어쓰기 하시겠습니까?`);
        if (!confirmed) return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = translations[currentLang].btn_save_cloud_saving;
    errorEl.style.display = 'none';

    const isMmMode = document.querySelector('input[name="yarnUnit"]:checked')?.value === 'mm';
    const settings = {
        title,
        tags: [],
        widthCm: parseFloat(targetWidthInput.value) || 50,
        yarnType: isMmMode ? null : yarnWeightSelect.value,
        yarnMm: isMmMode ? (parseFloat(yarnMmInput.value) || null) : null,
        colorCount: parseInt(colorCountInput.value) || 15,
        showGrid: showGridCheckbox.checked,
        techniqueRatio: parseFloat(techniqueRatioSelect.value) || 1
    };

    try {
        const docId = await savePatternToCloud(canvas, previewCanvas, colorLegend.innerHTML, patternInfo.textContent, settings, overwriteDocId);
        lastSavedTitle = title;
        lastSavedDocId = docId;
        document.getElementById('patternSaveModal').style.display = 'none';
        saveToCloudBtn.textContent = translations[currentLang].btn_save_cloud_done;
        saveToCloudBtn.disabled = true;
        showStatus('status_saved', false);
    } catch (err) {
        console.error('Cloud save failed:', err);
        submitBtn.disabled = false;
        submitBtn.textContent = translations[currentLang]?.btn_modal_save || '저장';
        errorEl.textContent = translations[currentLang]?.save_error || '저장 중 오류가 발생했습니다.';
        errorEl.style.display = 'block';
    }
});
