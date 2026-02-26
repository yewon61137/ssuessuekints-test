// main.js - 뜨개질 도안 생성기 핵심 로직

import { getPixelArray, kMeans, rgbToHex, hexToRgb } from './colorUtils.js';

// --- 상태 관리 ---
let originalImage = null;

// --- DOM 요소 ---
const imageUpload = document.getElementById('imageUpload');
const yarnWeightSelect = document.getElementById('yarnWeight');
const targetWidthInput = document.getElementById('targetWidth');
const targetHeightInput = document.getElementById('targetHeight');
const bgColorInput = document.getElementById('bgColor');
const colorCountInput = document.getElementById('colorCount');
const showGridCheckbox = document.getElementById('showGrid');
const generateBtn = document.getElementById('generateBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const statusMessage = document.getElementById('statusMessage');
const patternInfo = document.getElementById('patternInfo');
const canvas = document.getElementById('patternCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const colorLegend = document.getElementById('colorLegend');

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
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// --- 2. 도안 생성 로직 ---
generateBtn.addEventListener('click', async () => {
    if (!originalImage) return;

    generateBtn.disabled = true;
    showStatus('도안 생성 중... K-means++ 알고리즘 적용 중...', false);

    // 1) 입력값 가져오기
    const widthCm = parseFloat(targetWidthInput.value);
    const heightCm = parseFloat(targetHeightInput.value);
    const yarnType = yarnWeightSelect.value;
    const colorCount = parseInt(colorCountInput.value, 10);
    const showGrid = showGridCheckbox.checked;
    const bgColorHex = bgColorInput.value;

    if (isNaN(widthCm) || isNaN(heightCm) || widthCm < 10 || heightCm < 10) {
        showStatus('올바른 크기(cm)를 입력하세요 (최소 10cm).', true);
        generateBtn.disabled = false;
        return;
    }

    // 2) 실 굵기에 따른 코수/단수 계산
    const gauge = gaugeData[yarnType];
    // 총 코수 = (가로cm / 10) * 10cm당 코수
    const targetStitches = Math.round((widthCm / 10) * gauge.sts);
    const targetRows = Math.round((heightCm / 10) * gauge.rows);

    // 3) 도안 비율에 맞춰 이미지 배치 (Letterboxing - 빈 공간은 배경색으로)
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = targetStitches;
    tempCanvas.height = targetRows;

    // 배경색 채우기
    tempCtx.fillStyle = bgColorHex;
    tempCtx.fillRect(0, 0, targetStitches, targetRows);

    // 이미지 비율 유지하며 가운데 그리기 계산
    const imgRatio = originalImage.width / originalImage.height;
    const targetRatio = targetStitches / targetRows;
    
    let drawW, drawH, drawX, drawY;

    if (imgRatio > targetRatio) {
        // 이미지가 더 가로로 긴 경우 -> 가로를 꽉 채우고 상하에 여백
        drawW = targetStitches;
        drawH = Math.round(targetStitches / imgRatio);
        drawX = 0;
        drawY = Math.round((targetRows - drawH) / 2);
    } else {
        // 이미지가 더 세로로 긴 경우 -> 세로를 꽉 채우고 좌우에 여백
        drawH = targetRows;
        drawW = Math.round(targetRows * imgRatio);
        drawX = Math.round((targetStitches - drawW) / 2);
        drawY = 0;
    }

    tempCtx.drawImage(originalImage, drawX, drawY, drawW, drawH);

    // 4) 픽셀 데이터 추출 및 색상 양자화 (비동기 흉내)
    setTimeout(() => {
        try {
            const imageData = tempCtx.getImageData(0, 0, targetStitches, targetRows);
            const pixels = getPixelArray(imageData);
            
            // K-means++ 클러스터링
            const { palette, assignments } = kMeans(pixels, colorCount, 15);
            
            // 5) 매핑된 색상으로 임시 캔버스 덮어쓰기
            const newImageData = tempCtx.createImageData(targetStitches, targetRows);
            for (let i = 0; i < pixels.length; i++) {
                const colorIdx = assignments[i];
                const color = palette[colorIdx];
                newImageData.data[i * 4] = color[0];     
                newImageData.data[i * 4 + 1] = color[1]; 
                newImageData.data[i * 4 + 2] = color[2]; 
                newImageData.data[i * 4 + 3] = 255;      
            }
            tempCtx.putImageData(newImageData, 0, 0);

            // 6) 메인 캔버스에 확대해서 그리기
            const pixelSize = Math.max(4, Math.min(15, Math.floor(800 / targetStitches))); 
            const renderWidth = targetStitches * pixelSize;
            const renderHeight = targetRows * pixelSize;
            
            canvas.width = renderWidth;
            canvas.height = renderHeight;
            
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(tempCanvas, 0, 0, targetStitches, targetRows, 0, 0, renderWidth, renderHeight);

            // 7) 그리드 그리기
            if (showGrid) {
                drawGrid(targetStitches, targetRows, pixelSize);
            }

            // 8) 정보 및 색상표 업데이트
            patternInfo.textContent = `도안 크기: 가로 ${targetStitches}코 × 세로 ${targetRows}단 (${widthCm}cm x ${heightCm}cm)`;
            updateLegend(palette);
            
            showStatus('도안 생성이 완료되었습니다!', false);
            downloadPdfBtn.disabled = false;
            
        } catch (error) {
            console.error(error);
            showStatus('도안 생성 중 오류가 발생했습니다.', true);
        } finally {
            generateBtn.disabled = false;
        }
    }, 50);
});

// --- 3. 그리드 그리기 ---
function drawGrid(cols, rows, cellSize) {
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
    for (let x = 0; x <= cols; x += 10) {
        ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, rows * cellSize); ctx.stroke();
    }
    for (let y = 0; y <= rows; y += 10) {
        ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(cols * cellSize, y * cellSize); ctx.stroke();
    }
    ctx.strokeRect(0, 0, cols * cellSize, rows * cellSize);
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

// --- 5. PDF 다운로드 ---
downloadPdfBtn.addEventListener('click', () => {
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

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

        const infoText = patternInfo.textContent;
        pdf.setFontSize(12);
        pdf.text("My Knitting Pattern - " + infoText, margin, margin + 5);
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