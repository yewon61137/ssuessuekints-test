// main.js - 뜨개질 도안 생성기 핵심 로직

import { getPixelArray, kMeans, rgbToHex } from './colorUtils.js';

// --- 상태 관리 ---
let originalImage = null; // 업로드된 원본 이미지 객체 보관
let generatedPatternData = null; // 생성된 도안 데이터 (PDF 출력용)

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

    // 4) 픽셀 데이터 추출 및 색상 양자화 (Web Worker를 쓰면 좋지만 우선 동기식으로 구현)
    // 비동기 처리 흉내내어 UI 멈춤 현상 완화
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
            // 화면에 표시할 때는 각 픽셀(코)을 일정 크기의 정사각형으로 그립니다.
            const pixelSize = 10; // 1코당 10x10 픽셀로 확대 렌더링
            const renderWidth = targetWidth * pixelSize;
            const renderHeight = targetHeight * pixelSize;
            
            canvas.width = renderWidth;
            canvas.height = renderHeight;
            
            // 안티앨리어싱 끄기 (Pixel Art 스타일 유지)
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight, 0, 0, renderWidth, renderHeight);

            // 7) 그리드 (10x10 단/코 마다 굵은 선 표시) 그리기
            if (showGrid) {
                drawGrid(targetWidth, targetHeight, pixelSize);
            }

            // 8) 색상표(Legend) 업데이트
            updateLegend(palette);
            
            // 성공 상태 업데이트
            showStatus('도안 생성이 완료되었습니다!', false);
            downloadPdfBtn.disabled = false;
            
        } catch (error) {
            console.error(error);
            showStatus('도안 생성 중 오류가 발생했습니다.', true);
        } finally {
            generateBtn.disabled = false;
        }
    }, 50); // 짧은 지연시간을 주어 UI가 '생성중...' 텍스트를 그릴 여유를 줌
});

// --- 3. 그리드 그리기 ---
function drawGrid(cols, rows, cellSize) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'; // 얇은 기본 선
    ctx.lineWidth = 1;

    // 1코(칸)마다 얇은 선 그리기 (선택사항, 너무 복잡하면 제거 가능)
    // for (let x = 0; x <= cols; x++) {
    //    ctx.beginPath();
    //    ctx.moveTo(x * cellSize, 0);
    //    ctx.lineTo(x * cellSize, rows * cellSize);
    //    ctx.stroke();
    // }
    
    // 10코/10단마다 굵은 선 그리기 (가독성 향상)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'; // 진한 선
    ctx.lineWidth = 2;

    // 세로 선 (10코 단위)
    for (let x = 0; x <= cols; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x * cellSize, 0);
        ctx.lineTo(x * cellSize, rows * cellSize);
        ctx.stroke();
    }
    // 가로 선 (10단 단위)
    for (let y = 0; y <= rows; y += 10) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellSize);
        ctx.lineTo(cols * cellSize, y * cellSize);
        ctx.stroke();
    }
    
    // 외곽선 굵게
    ctx.strokeRect(0, 0, cols * cellSize, rows * cellSize);
}

// --- 4. 색상표(Legend) UI 업데이트 ---
function updateLegend(palette) {
    colorLegend.innerHTML = '';
    
    // 각 색상마다 리스트 아이템 생성
    palette.forEach((color, index) => {
        const hex = rgbToHex(color);
        const li = document.createElement('li');
        li.className = 'color-item';
        
        const box = document.createElement('div');
        box.className = 'color-box';
        box.style.backgroundColor = hex;
        
        const text = document.createElement('span');
        // 번호는 1번부터 시작, 그리고 해당 색상의 Hex 코드 표시
        text.textContent = `No.${index + 1} (${hex})`;
        
        li.appendChild(box);
        li.appendChild(text);
        colorLegend.appendChild(li);
    });
}
