// main.js - 뜨개질 도안 생성기 핵심 로직

import { getPixelArray, kMeans, rgbToHex, hexToRgb } from './colorUtils.js';

// --- 상태 관리 ---
let originalImage = null;
let patternHistory = []; // { dataURL, legendHTML, infoText, id }
let isPreviewMode = false;
let seedColors = [];

// --- DOM 요소 ---
const imageUpload = document.getElementById('imageUpload');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const resultPlaceholder = document.getElementById('resultPlaceholder');
const previewArea = document.getElementById('previewArea');
const previewCanvas = document.getElementById('previewCanvas');
const previewCtx = previewCanvas.getContext('2d', { willReadFrequently: true });
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
const statusMessage = document.getElementById('statusMessage');
const resultPanel = document.getElementById('resultPanel');
const patternInfo = document.getElementById('patternInfo');
const canvas = document.getElementById('patternCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const magnifierCanvas = document.getElementById('magnifierCanvas');
const magnifierCtx = magnifierCanvas.getContext('2d');
const colorLegend = document.getElementById('colorLegend');
const historyPanel = document.getElementById('historyPanel');
const historyThumbnails = document.getElementById('historyThumbnails');
const langBtns = document.querySelectorAll('.lang-btn');

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
        unit_colors: "색",
        label_grid: "10단위 그리드 및 좌표 표시",
        regen_hint: "💡 버튼을 다시 누를 때마다 조금씩 다른 도안이 생성됩니다.",
        btn_generate: "도안 생성하기",
        btn_download: "PDF 다운로드",
        result_title: "4. 생성된 도안",
        result_placeholder: "도안을 생성하면 여기에 표시됩니다.",
        history_title: "최근 생성 기록 (클릭하여 비교)",
        legend_title: "사용된 색상표 (실 번호)",
        status_loaded: "이미지가 로드되었습니다. 설정을 확인하고 도안을 생성하세요.",
        status_generating: "도안 생성 중... 잠시만 기다려주세요.",
        status_done: "도안 생성 완료!",
        status_error: "생성 중 오류 발생",
        status_format_err: "JPG 또는 PNG 파일만 업로드 가능합니다."
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
        unit_colors: "colors",
        label_grid: "Show 10-unit Grid & Coordinates",
        regen_hint: "💡 Re-generate to get slightly different color combinations.",
        btn_generate: "Generate Pattern",
        btn_download: "Download PDF",
        result_title: "4. Generated Pattern",
        result_placeholder: "Pattern will appear here after generation.",
        history_title: "Recent History (Click to compare)",
        legend_title: "Color Legend (Thread No.)",
        status_loaded: "Image loaded. Adjust settings and generate.",
        status_generating: "Generating pattern... please wait.",
        status_done: "Pattern generation complete!",
        status_error: "Error during generation",
        status_format_err: "Only JPG or PNG files are supported."
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
        opt_ratio_1: "かぎ針編み / クロ스ステッチ (1:1)",
        opt_ratio_2: "棒針編み 人物 (5:7)",
        opt_ratio_3: "棒針編み 風景 (7:5)",
        label_yarn_unit: "糸の太さ 입력 방식",
        unit_standard: "標準規格",
        unit_mm: "直径 (mm)",
        label_yarn_name: "糸の太さ (標準)",
        label_yarn_mm: "糸の太さ (mm)",
        label_width: "仕上がり幅",
        label_max_colors: "最大色数",
        unit_colors: "色",
        label_grid: "10単位グリッドと座標を表示",
        regen_hint: "💡 ボタンをもう一度押すと、少しずつ異なる配色が生成されます。",
        btn_generate: "編み図を生成",
        btn_download: "PDFをダウンロード",
        result_title: "4. 生成された編み図",
        result_placeholder: "生成された編み図がここに表示されます。",
        history_title: "最近の履歴 (クリックで比較)",
        legend_title: "カラーチャート (糸番号)",
        status_loaded: "画像が読み込まれました。設定を確認して生成してください。",
        status_generating: "編み図を生成中... 少々お待ちください。",
        status_done: "編み図の生成が完了しました！",
        status_error: "生成中にエラーが発生しました",
        status_format_err: "JPGまたはPNGファイルのみアップロード可能です。"
    }
};

let currentLang = 'ko';

function changeLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            el.innerHTML = translations[lang][key];
        }
    });
    
    // Update active button state
    langBtns.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
}

langBtns.forEach(btn => {
    btn.addEventListener('click', () => changeLanguage(btn.getAttribute('data-lang')));
});

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

// --- 1. 이미지 업로드 처리 ---
imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
        showStatus('status_format_err', true);
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
            previewCtx.drawImage(img, 0, 0, drawWidth, drawHeight);
            
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

// --- Seed Colors (필수 색상) 선택 및 돋보기 로직 (마우스/터치 호환) ---
const MAGNIFIER_SIZE = 120;
const MAGNIFIER_ZOOM = 6;

magnifierCanvas.width = MAGNIFIER_SIZE;
magnifierCanvas.height = MAGNIFIER_SIZE;

function handlePointerMove(e) {
    if (!isPreviewMode || !originalImage) {
        magnifierCanvas.style.display = 'none';
        return;
    }

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
        if (e.cancelable) e.preventDefault(); 
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    const rect = previewCanvas.getBoundingClientRect();
    const scaleX = previewCanvas.width / rect.width;
    const scaleY = previewCanvas.height / rect.height;
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const cssX = clientX - rect.left;
    const cssY = clientY - rect.top;

    magnifierCanvas.style.display = 'block';
    
    const isTouch = e.type.includes('touch');
    const offsetX = - (MAGNIFIER_SIZE / 2);
    const offsetY = isTouch ? - MAGNIFIER_SIZE - 40 : - (MAGNIFIER_SIZE / 2);
    
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

    magnifierCtx.strokeStyle = 'red';
    magnifierCtx.lineWidth = 2;
    magnifierCtx.beginPath();
    magnifierCtx.moveTo(MAGNIFIER_SIZE/2 - 8, MAGNIFIER_SIZE/2);
    magnifierCtx.lineTo(MAGNIFIER_SIZE/2 + 8, MAGNIFIER_SIZE/2);
    magnifierCtx.moveTo(MAGNIFIER_SIZE/2, MAGNIFIER_SIZE/2 - 8);
    magnifierCtx.lineTo(MAGNIFIER_SIZE/2, MAGNIFIER_SIZE/2 + 8);
    magnifierCtx.stroke();
    magnifierCtx.restore();
}

function handlePointerEnd(e) {
    if (!isPreviewMode || !originalImage) return;
    magnifierCanvas.style.display = 'none';

    let clientX, clientY;
    if (e.type === 'touchend') {
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
    if (pixel[3] > 0) { 
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

    const widthCm = parseFloat(targetWidthInput.value);
    const isMmMode = document.querySelector('input[name="yarnUnit"]:checked').value === 'mm';
    const yarnType = yarnWeightSelect.value;
    const yarnMm = yarnMmInput.value;
    
    const colorCount = parseInt(colorCountInput.value, 10);
    const showGrid = showGridCheckbox.checked;
    const techniqueRatio = parseFloat(techniqueRatioSelect.value);

    if (isNaN(widthCm) || widthCm < 10) {
        showStatus('status_error', true);
        generateBtn.disabled = false;
        return;
    }

    const gauge = isMmMode ? getGaugeFromMm(yarnMm) : gaugeData[yarnType];
    
    const targetStitches = Math.round((widthCm / 10) * gauge.sts);
    const imgRatio = originalImage.height / originalImage.width;
    const targetRows = Math.round(targetStitches * imgRatio * techniqueRatio);

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    tempCanvas.width = targetStitches;
    tempCanvas.height = targetRows;
    tempCtx.drawImage(originalImage, 0, 0, targetStitches, targetRows);

    setTimeout(() => {
        try {
            const imageData = tempCtx.getImageData(0, 0, targetStitches, targetRows);
            const pixels = getPixelArray(imageData, targetStitches, targetRows);
            const { palette, assignments } = kMeans(pixels, colorCount, targetStitches, targetRows, 15, seedColors);
            
            const pixelSize = Math.max(8, Math.min(20, Math.floor(800 / targetStitches))); 
            const renderWidth = targetStitches * pixelSize;
            const renderHeight = targetRows * pixelSize;
            const padding = showGrid ? 40 : 0;
            
            canvas.width = renderWidth + padding;
            canvas.height = renderHeight + padding;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            for (let y = 0; y < targetRows; y++) {
                for (let x = 0; x < targetStitches; x++) {
                    const idx = y * targetStitches + x;
                    const colorIdx = assignments[idx];
                    const color = palette[colorIdx];
                    ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
                    ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
                }
            }

            if (showGrid) {
                drawGridWithLabels(targetStitches, targetRows, pixelSize);
            }

            resultPanel.style.display = 'block';
            resultPlaceholder.style.display = 'none';
            canvas.style.display = 'block';
            
            const calcHeightCm = ((targetRows / gauge.rows) * 10).toFixed(1);
            patternInfo.textContent = `${targetStitches} Stitches x ${targetRows} Rows (approx. ${widthCm}cm x ${calcHeightCm}cm)`;
            updateLegend(palette);
            
            showStatus('status_done', false);
            downloadPdfBtn.disabled = false;
            saveToHistory(canvas.toDataURL('image/png'), colorLegend.innerHTML, patternInfo.textContent);
            
            resultPanel.scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error(error);
            showStatus('status_error', true);
        } finally {
            generateBtn.disabled = false;
        }
    }, 50);
});

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

function updateLegend(palette) {
    colorLegend.innerHTML = '';
    palette.forEach((color, index) => {
        const hex = rgbToHex(color);
        const li = document.createElement('li');
        li.className = 'color-item';
        const box = document.createElement('div');
        box.className = 'color-box';
        box.style.backgroundColor = hex;
        const text = document.createElement('span');
        text.textContent = `No.${index + 1} (${hex})`;
        li.appendChild(box);
        li.appendChild(text);
        colorLegend.appendChild(li);
    });
}

function saveToHistory(dataURL, legendHTML, infoText) {
    const id = Date.now();
    patternHistory.push({ id, dataURL, legendHTML, infoText });
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
            const tempImg = new Image();
            tempImg.onload = () => {
                canvas.width = tempImg.width;
                canvas.height = tempImg.height;
                ctx.drawImage(tempImg, 0, 0);
            };
            tempImg.src = item.dataURL;
            colorLegend.innerHTML = item.legendHTML;
            patternInfo.textContent = item.infoText;
            document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
            img.classList.add('active');
        });
        historyThumbnails.appendChild(img);
    });
}

downloadPdfBtn.addEventListener('click', () => {
    try {
        const { jsPDF } = window.jspdf;
        const PDFDocument = jsPDF || window.jsPDF; 
        const pdf = new PDFDocument({ orientation: 'p', unit: 'mm', format: 'a4' });
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const maxW = pdfWidth - (margin * 2);
        const maxH = pdfHeight - (margin * 2) - 40;
        let finalW = maxW;
        let finalH = (canvas.height / canvas.width) * finalW;
        if (finalH > maxH) { finalH = maxH; finalW = (canvas.width / canvas.height) * finalH; }
        
        pdf.setFontSize(14);
        pdf.text("Knitting Pattern", margin, margin + 5);
        
        pdf.setFontSize(10);
        const numbers = patternInfo.textContent.match(/\d+(\.\d+)?/g);
        let englishInfo = "";
        if (numbers && numbers.length >= 4) {
            englishInfo = `${numbers[0]} Stitches x ${numbers[1]} Rows (${numbers[2]}cm x ${numbers[3]}cm)`;
        } else {
            englishInfo = "Knitting Pattern Details";
        }
        // y 좌표를 margin + 15 정도로 내려서 잘림 방지
        pdf.text(englishInfo, margin, margin + 15);
        
        // 이미지 시작 위치를 더 내려서 텍스트와 겹치지 않게 함
        pdf.addImage(imgData, 'JPEG', margin, margin + 25, finalW, finalH);
        pdf.addPage();
        pdf.text("Color Legend", margin, margin + 5);
        let currentY = margin + 15;
        let currentX = margin;
        document.querySelectorAll('.color-item').forEach((item) => {
            const rgbMatch = item.querySelector('.color-box').style.backgroundColor.match(/\d+/g);
            if(rgbMatch) {
                 pdf.setFillColor(parseInt(rgbMatch[0]), parseInt(rgbMatch[1]), parseInt(rgbMatch[2]));
                 pdf.rect(currentX, currentY, 10, 10, 'F');
                 pdf.setDrawColor(0);
                 pdf.rect(currentX, currentY, 10, 10, 'S');
                 pdf.setFontSize(10);
                 pdf.text(item.querySelector('span').textContent, currentX + 15, currentY + 7);
                 currentY += 15;
                 if (currentY > pdfHeight - margin) { currentY = margin + 15; currentX += 60; }
            }
        });
        pdf.save('knitting_pattern.pdf');
    } catch (e) {
        showStatus('status_error', true);
    }
});