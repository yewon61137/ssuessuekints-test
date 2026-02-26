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
const yarnWeightSelect = document.getElementById('yarnWeight');
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

// --- 게이지 데이터 (10x10cm 기준 평균 코/단 수) ---
const gaugeData = {
    lace: { sts: 32, rows: 40 },
    fingering: { sts: 28, rows: 36 },
    dk: { sts: 22, rows: 28 },
    aran: { sts: 18, rows: 24 },
    chunky: { sts: 14, rows: 20 },
    super_bulky: { sts: 10, rows: 14 }
};

// 상태 메시지 표시 유틸리티
function showStatus(msg, isError = false) {
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
        showStatus('JPG 또는 PNG 파일만 업로드 가능합니다.', true);
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
            
            // 프리뷰 캔버스에 그리기 (최대 폭 제한)
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
            showStatus('이미지가 로드되었습니다. 설정을 확인하고 도안을 생성하세요.', false);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// --- Seed Colors (필수 색상) 선택 및 돋보기 로직 ---
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
    // 마우스일 때는 커서 정중앙에, 터치일 때는 손가락 위 40px 지점에 배치
    const offsetX = - (MAGNIFIER_SIZE / 2);
    const offsetY = isTouch ? - MAGNIFIER_SIZE - 40 : - (MAGNIFIER_SIZE / 2);
    
    // 부모 요소(wrapper) 내에서의 캔버스 위치(offsetLeft/Top)를 더해줘야 정확한 위치에 돋보기가 뜹니다.
    magnifierCanvas.style.left = `${cssX + previewCanvas.offsetLeft + offsetX}px`;
    magnifierCanvas.style.top = `${cssY + previewCanvas.offsetTop + offsetY}px`;

    magnifierCtx.clearRect(0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);
    magnifierCtx.save();
    // Circular clipping removed for square hip look
    
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
        seedColorList.innerHTML = '<li class="empty-msg">사진을 클릭해 필수 색상을 추가하세요.</li>';
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
    showStatus('도안 생성 중... 잠시만 기다려주세요.', false);

    const widthCm = parseFloat(targetWidthInput.value);
    const yarnType = yarnWeightSelect.value;
    const colorCount = parseInt(colorCountInput.value, 10);
    const showGrid = showGridCheckbox.checked;
    const techniqueRatio = parseFloat(techniqueRatioSelect.value);

    if (isNaN(widthCm) || widthCm < 10) {
        showStatus('올바른 가로 크기를 입력하세요.', true);
        generateBtn.disabled = false;
        return;
    }

    const gauge = gaugeData[yarnType];
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
            patternInfo.textContent = `가로 ${targetStitches}코 × 세로 ${targetRows}단 (약 ${widthCm}cm x ${calcHeightCm}cm)`;
            updateLegend(palette);
            
            showStatus('도안 생성 완료!', false);
            downloadPdfBtn.disabled = false;
            saveToHistory(canvas.toDataURL('image/png'), colorLegend.innerHTML, patternInfo.textContent);
            
            // 결과창으로 스크롤 이동
            resultPanel.scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error(error);
            showStatus('생성 중 오류 발생', true);
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
        // patternInfo.textContent에서 숫자만 추출하여 영문으로 변환 (한글 깨짐 방지)
        const numbers = patternInfo.textContent.match(/\d+(\.\d+)?/g);
        let englishInfo = "";
        if (numbers && numbers.length >= 4) {
            englishInfo = `${numbers[0]} Stitches x ${numbers[1]} Rows (${numbers[2]}cm x ${numbers[3]}cm)`;
        } else {
            englishInfo = "Knitting Pattern Details";
        }
        pdf.text(englishInfo, margin, margin + 12);
        
        pdf.addImage(imgData, 'JPEG', margin, margin + 18, finalW, finalH);
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
        showStatus('PDF 생성 실패', true);
    }
});