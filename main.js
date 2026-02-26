// main.js - 뜨개질 도안 생성기 핵심 로직

import { getPixelArray, kMeans, rgbToHex } from './colorUtils.js';

// --- 상태 관리 ---
let originalImage = null; // 업로드된 원본 이미지 객체 보관

// --- DOM 요소 ---
const imageUpload = document.getElementById('imageUpload');
const widthStitchesInput = document.getElementById('widthStitches');
const colorCountInput = document.getElementById('colorCount');
const showGridCheckbox = document.getElementById('showGrid');
const generateBtn = document.getElementById('generateBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const statusMessage = document.getElementById('statusMessage');
const canvas = document.getElementById('patternCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const colorLegend = document.getElementById('colorLegend');

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
            
            // 프리뷰용으로 캔버스에 그리기
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
            
            // 초기화
            colorLegend.innerHTML = '<li class="empty-msg">도안을 생성하면 색상표가 표시됩니다.</li>';
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
    showStatus('도안 생성 중... (이미지 크기에 따라 시간이 걸릴 수 있습니다.)', false);

    // 1) 입력값 가져오기
    const targetWidth = parseInt(widthStitchesInput.value, 10);
    const colorCount = parseInt(colorCountInput.value, 10);
    const showGrid = showGridCheckbox.checked;

    if (isNaN(targetWidth) || targetWidth < 10) {
        showStatus('올바른 가로 코 수를 입력하세요 (최소 10).', true);
        generateBtn.disabled = false;
        return;
    }

    // 2) 원본 비율에 맞춰 세로 단(Row) 수 계산
    const ratio = originalImage.height / originalImage.width;
    const targetHeight = Math.round(targetWidth * ratio);

    // 3) 이미지를 목표 픽셀 수(코 수)로 리사이징하기 위해 임시 캔버스 사용
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = targetWidth;
    tempCanvas.height = targetHeight;
    tempCtx.drawImage(originalImage, 0, 0, targetWidth, targetHeight);

    // 4) 픽셀 데이터 추출 및 색상 양자화 (비동기 흉내내어 UI 멈춤 방지)
    setTimeout(() => {
        try {
            const imageData = tempCtx.getImageData(0, 0, targetWidth, targetHeight);
            const pixels = getPixelArray(imageData);
            
            // K-means 클러스터링을 통해 대표 색상 및 매핑 배열 얻기
            const { palette, assignments } = kMeans(pixels, colorCount, 15);
            
            // 5) 매핑된 색상으로 임시 캔버스 데이터 덮어쓰기
            const newImageData = tempCtx.createImageData(targetWidth, targetHeight);
            for (let i = 0; i < pixels.length; i++) {
                const colorIdx = assignments[i];
                const color = palette[colorIdx];
                newImageData.data[i * 4] = color[0];     // R
                newImageData.data[i * 4 + 1] = color[1]; // G
                newImageData.data[i * 4 + 2] = color[2]; // B
                newImageData.data[i * 4 + 3] = 255;      // A
            }
            tempCtx.putImageData(newImageData, 0, 0);

            // 6) 메인 캔버스에 확대해서 그리기 (선명도 유지)
            // 1코를 몇 픽셀로 그릴지 결정 (최소 10픽셀, 도안이 너무 크면 조절)
            const pixelSize = Math.max(5, Math.min(20, Math.floor(800 / targetWidth))); 
            const renderWidth = targetWidth * pixelSize;
            const renderHeight = targetHeight * pixelSize;
            
            canvas.width = renderWidth;
            canvas.height = renderHeight;
            
            // 안티앨리어싱 끄기 (Pixel Art 스타일 유지)
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight, 0, 0, renderWidth, renderHeight);

            // 7) 그리드 그리기 (10단위 굵은 선, 1단위 얇은 선)
            if (showGrid) {
                drawGrid(targetWidth, targetHeight, pixelSize);
            }

            // 8) 색상표(Legend) 업데이트
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
    // 1칸 단위 얇은 선
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)'; 
    ctx.lineWidth = 1;
    for (let x = 0; x <= cols; x++) {
        ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, rows * cellSize); ctx.stroke();
    }
    for (let y = 0; y <= rows; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(cols * cellSize, y * cellSize); ctx.stroke();
    }
    
    // 10단/코 단위 굵은 선
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'; 
    ctx.lineWidth = 2;
    for (let x = 0; x <= cols; x += 10) {
        ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, rows * cellSize); ctx.stroke();
    }
    for (let y = 0; y <= rows; y += 10) {
        ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(cols * cellSize, y * cellSize); ctx.stroke();
    }
    
    // 외곽선 굵게
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

// --- 5. PDF 다운로드 (jsPDF 활용) ---
downloadPdfBtn.addEventListener('click', () => {
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        // 1. 도안 이미지 캡처
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        // PDF 가로 크기 (297mm)에 맞게 도안 리사이징
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // 여백 10mm
        const margin = 10;
        const maxContentWidth = pdfWidth - (margin * 2);
        const maxContentHeight = pdfHeight - (margin * 2) - 40; // 하단 색상표 공간 확보

        // 캔버스 비율에 맞춰 PDF 내 이미지 크기 계산
        let finalWidth = maxContentWidth;
        let finalHeight = (canvas.height / canvas.width) * finalWidth;
        
        if (finalHeight > maxContentHeight) {
            finalHeight = maxContentHeight;
            finalWidth = (canvas.width / canvas.height) * finalHeight;
        }

        // 이미지 그리기
        pdf.text("My Knitting Pattern", margin, margin + 5);
        pdf.addImage(imgData, 'JPEG', margin, margin + 10, finalWidth, finalHeight);

        // 2. 새로운 페이지에 색상표 그리기
        pdf.addPage();
        pdf.text("Color Legend", margin, margin + 5);
        
        const colorItems = document.querySelectorAll('.color-item');
        let currentY = margin + 15;
        let currentX = margin;
        
        colorItems.forEach((item, index) => {
            const rgbMatch = item.querySelector('.color-box').style.backgroundColor.match(/\d+/g);
            if(rgbMatch) {
                 // 색상 박스 채우기
                 pdf.setFillColor(parseInt(rgbMatch[0]), parseInt(rgbMatch[1]), parseInt(rgbMatch[2]));
                 pdf.rect(currentX, currentY, 10, 10, 'F');
                 // 테두리
                 pdf.setDrawColor(0);
                 pdf.rect(currentX, currentY, 10, 10, 'S');
                 // 텍스트
                 pdf.setFontSize(10);
                 pdf.text(item.querySelector('span').textContent, currentX + 15, currentY + 7);
                 
                 currentY += 15;
                 
                 // 한 줄이 꽉 차면 옆 열로 이동
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