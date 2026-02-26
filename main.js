// main.js - 뜨개질 도안 생성기 핵심 로직

import { getPixelArray, kMeans, rgbToHex, hexToRgb } from './colorUtils.js';

// --- 상태 관리 ---
let originalImage = null;
let patternHistory = []; // { dataURL, legendHTML, infoText, id }
let isPreviewMode = false;
let seedColors = [];

// --- DOM 요소 ---
const imageUpload = document.getElementById('imageUpload');
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
const patternInfo = document.getElementById('patternInfo');
const canvas = document.getElementById('patternCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
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
    statusMessage.style.color = isError ? '#dc2626' : '#16a34a';
}

// 초기화
generateBtn.disabled = true;

// --- 1. 이미지 업로드 처리 ---
imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
        showStatus('JPG 또는 PNG 파일만 업로드 가능합니다.', true);
        originalImage = null;
        generateBtn.disabled = true;
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            showStatus('이미지 로드 완료! 도안을 생성해주세요.', false);
            generateBtn.disabled = false;
            
            // 프리뷰
            const maxPreviewWidth = 600;
            let drawWidth = img.width;
            let drawHeight = img.height;
            if (drawWidth > maxPreviewWidth) {
                const ratio = maxPreviewWidth / drawWidth;
                drawWidth = maxPreviewWidth;
                drawHeight = img.height * ratio;
            }
            canvas.width = drawWidth;
            canvas.height = drawHeight;
            ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
            
            colorLegend.innerHTML = '<li class="empty-msg">도안을 생성하면 색상표가 표시됩니다.</li>';
            patternInfo.textContent = '';
            downloadPdfBtn.disabled = true;
            
            // 새 이미지가 업로드되면 기록 초기화
            patternHistory = [];
            renderHistory();
            
            // Seed Colors 초기화
            isPreviewMode = true;
            seedColors = [];
            renderSeedColors();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// --- Seed Colors (필수 색상) 선택 로직 ---
canvas.addEventListener('click', (e) => {
    if (!isPreviewMode || !originalImage) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    if (pixel[3] > 0) { // 투명하지 않은 픽셀만
        seedColors.push([pixel[0], pixel[1], pixel[2]]);
        renderSeedColors();
    }
});

function renderSeedColors() {
    seedColorList.innerHTML = '';
    if (seedColors.length === 0) {
        seedColorList.innerHTML = '<li class="empty-msg">이미지를 클릭하여 색상을 추가하세요.</li>';
        clearSeedsBtn.style.display = 'none';
        return;
    }
    
    clearSeedsBtn.style.display = 'block';
    seedColors.forEach((color) => {
        const hex = rgbToHex(color);
        const li = document.createElement('li');
        li.className = 'seed-color-item';
        li.style.padding = '0.2rem';
        
        const box = document.createElement('div');
        box.className = 'color-box';
        box.style.backgroundColor = hex;
        box.title = hex;
        
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
    isPreviewMode = false;
    showStatus('도안 생성 중... 알고리즘이 뚜렷한 색상을 찾고 있습니다...', false);

    const widthCm = parseFloat(targetWidthInput.value);
    const yarnType = yarnWeightSelect.value;
    const colorCount = parseInt(colorCountInput.value, 10);
    const showGrid = showGridCheckbox.checked;
    const techniqueRatio = parseFloat(techniqueRatioSelect.value);

    if (isNaN(widthCm) || widthCm < 10) {
        showStatus('올바른 크기(cm)를 입력하세요 (최소 10cm).', true);
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
            // X, Y 좌표 정보를 함께 추출
            const pixels = getPixelArray(imageData, targetStitches, targetRows);
            
            // 채도 및 중앙 가중치가 적용된 K-means++ (+ Seed Colors)
            const { palette, assignments } = kMeans(pixels, colorCount, targetStitches, targetRows, 15, seedColors);
            
            const pixelSize = Math.max(8, Math.min(20, Math.floor(800 / targetStitches))); 
            const renderWidth = targetStitches * pixelSize;
            const renderHeight = targetRows * pixelSize;
            
            const paddingRight = showGrid ? 35 : 0;
            const paddingBottom = showGrid ? 35 : 0;
            
            canvas.width = renderWidth + paddingRight;
            canvas.height = renderHeight + paddingBottom;
            
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // ctx.translate(paddingLeft, paddingTop); // Removed translation as padding is now bottom/right

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

            ctx.setTransform(1, 0, 0, 1, 0, 0);

            const calcHeightCm = ((targetRows / gauge.rows) * 10).toFixed(1);
            patternInfo.textContent = `도안 크기: 가로 ${targetStitches}코 × 세로 ${targetRows}단 (약 ${widthCm}cm x ${calcHeightCm}cm)`;
            updateLegend(palette);
            
            showStatus('도안 생성이 완료되었습니다! (마음에 들지 않으면 다시 생성해보세요)', false);
            downloadPdfBtn.disabled = false;
            
            // --- 생성된 도안을 기록(History)에 저장 ---
            saveToHistory(canvas.toDataURL('image/png'), colorLegend.innerHTML, patternInfo.textContent);
            
        } catch (error) {
            console.error(error);
            showStatus('도안 생성 중 오류가 발생했습니다.', true);
        } finally {
            generateBtn.disabled = false;
        }
    }, 50);
});

// --- 3. 그리드 및 좌표 라벨 그리기 ---
function drawGridWithLabels(cols, rows, cellSize) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)'; 
    ctx.lineWidth = 1;
    for (let x = 0; x <= cols; x++) {
        ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, rows * cellSize); ctx.stroke();
    }
    for (let y = 0; y <= rows; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(cols * cellSize, y * cellSize); ctx.stroke();
    }
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'; 
    ctx.lineWidth = 2;
    // 오른쪽부터 10단위 굵은 선 (코수)
    for (let x = cols; x >= 0; x -= 10) {
        ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, rows * cellSize); ctx.stroke();
    }
    // 아래쪽부터 10단위 굵은 선 (단수)
    for (let y = rows; y >= 0; y -= 10) {
        ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(cols * cellSize, y * cellSize); ctx.stroke();
    }
    ctx.strokeRect(0, 0, cols * cellSize, rows * cellSize);

    ctx.fillStyle = '#334155';
    ctx.font = '12px Pretendard, sans-serif';
    
    // Y축 (단수) - 오른쪽. 아래쪽(rows)이 0(또는 1단 시작), 위로 갈수록 증가
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let y = rows; y >= 0; y -= 10) {
        // 실제 뜨개질에서 첫 단을 1단으로 부르므로 (rows - y)가 0일 때 1로 표시하거나 그대로 0부터 표시
        // 0부터 10, 20 단위로 표시하도록 rows - y 사용
        ctx.fillText(rows - y, cols * cellSize + 8, y * cellSize);
    }
    
    // X축 (코수) - 아래쪽. 오른쪽(cols)이 0, 왼쪽으로 갈수록 증가
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let x = cols; x >= 0; x -= 10) {
        ctx.fillText(cols - x, x * cellSize, rows * cellSize + 8);
    }
}

// --- 4. 색상표(Legend) UI 업데이트 ---
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

// --- 5. 히스토리 (기록) 관리 기능 ---
function saveToHistory(dataURL, legendHTML, infoText) {
    const id = Date.now();
    patternHistory.push({ id, dataURL, legendHTML, infoText });
    
    // 최대 5개까지만 유지
    if (patternHistory.length > 5) {
        patternHistory.shift();
    }
    renderHistory();
}

function renderHistory() {
    // 기록이 1개 이하일 때는 굳이 패널을 보여주지 않음 (최소 2개부터 비교 의미가 있음)
    if (patternHistory.length <= 1) {
        historyPanel.style.display = 'none';
        return;
    }
    
    historyPanel.style.display = 'block';
    historyThumbnails.innerHTML = '';
    
    patternHistory.forEach((item, index) => {
        const img = document.createElement('img');
        img.src = item.dataURL;
        img.className = 'history-item';
        img.title = `도안 ${index + 1}`;
        
        // 현재 보여지고 있는 최신 도안 강조
        if (index === patternHistory.length - 1) {
             img.classList.add('active');
        }
        
        img.addEventListener('click', () => {
            restoreFromHistory(item);
            
            // 모든 썸네일에서 active 제거 후 클릭된 것에만 추가
            document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
            img.classList.add('active');
        });
        
        historyThumbnails.appendChild(img);
    });
}

function restoreFromHistory(item) {
    const img = new Image();
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    };
    img.src = item.dataURL;
    
    colorLegend.innerHTML = item.legendHTML;
    patternInfo.textContent = item.infoText;
    downloadPdfBtn.disabled = false;
    showStatus('이전 도안을 불러왔습니다.', false);
}

// --- 6. PDF 다운로드 ---
downloadPdfBtn.addEventListener('click', () => {
    try {
        const { jsPDF } = window.jspdf;
        // If jsPDF is still not found, try to access it globally as it might be attached to window directly depending on the CDN build
        const PDFDocument = jsPDF || window.jsPDF; 
        
        if (!PDFDocument) {
             throw new Error("jsPDF library is not loaded properly.");
        }

        const pdf = new PDFDocument({ orientation: 'p', unit: 'mm', format: 'a4' });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const maxContentWidth = pdfWidth - (margin * 2);
        const maxContentHeight = pdfHeight - (margin * 2) - 40;

        let finalWidth = maxContentWidth;
        let finalHeight = (canvas.height / canvas.width) * finalWidth;
        
        if (finalHeight > maxContentHeight) {
            finalHeight = maxContentHeight;
            finalWidth = (canvas.width / canvas.height) * finalHeight;
        }

        pdf.setFontSize(12);
        const titleText = "Knitting Pattern";
        const infoMatch = patternInfo.textContent.match(/(\d+)코 × 세로 (\d+)단/);
        let subText = "";
        if (infoMatch) {
            subText = ` - ${infoMatch[1]} Stitches x ${infoMatch[2]} Rows`;
        }
        
        pdf.text(titleText + subText, margin, margin + 5);
        pdf.addImage(imgData, 'JPEG', margin, margin + 10, finalWidth, finalHeight);

        pdf.addPage();
        pdf.text("Color Legend", margin, margin + 5);
        
        const colorItems = document.querySelectorAll('.color-item');
        let currentY = margin + 15;
        let currentX = margin;
        
        colorItems.forEach((item) => {
            const rgbMatch = item.querySelector('.color-box').style.backgroundColor.match(/\d+/g);
            if(rgbMatch) {
                 pdf.setFillColor(parseInt(rgbMatch[0]), parseInt(rgbMatch[1]), parseInt(rgbMatch[2]));
                 pdf.rect(currentX, currentY, 10, 10, 'F');
                 pdf.setDrawColor(0);
                 pdf.rect(currentX, currentY, 10, 10, 'S');
                 pdf.setFontSize(10);
                 pdf.text(item.querySelector('span').textContent, currentX + 15, currentY + 7);
                 
                 currentY += 15;
                 if (currentY > pdfHeight - margin) {
                     currentY = margin + 15;
                     currentX += 60;
                 }
            }
        });

        pdf.save('knitting_pattern.pdf');
    } catch (e) {
        console.error("PDF 생성 에러:", e);
        showStatus('PDF 생성에 실패했습니다.', true);
    }
});