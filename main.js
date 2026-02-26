// main.js - 뜨개질 도안 생성기 핵심 로직

import { getPixelArray, kMeans, rgbToHex, hexToRgb } from './colorUtils.js';

// --- 상태 관리 ---
let originalImage = null;

// --- DOM 요소 ---
const imageUpload = document.getElementById('imageUpload');
const techniqueRatioSelect = document.getElementById('techniqueRatio');
const yarnWeightSelect = document.getElementById('yarnWeight');
const targetWidthInput = document.getElementById('targetWidth');
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

// --- 2. 도안 생성 로직 (픽셀화 핵심) ---
generateBtn.addEventListener('click', async () => {
    if (!originalImage) return;

    generateBtn.disabled = true;
    showStatus('도안 생성 중... K-means++ 알고리즘 적용 중...', false);

    // 1) 입력값 가져오기
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

    // 2) 실 굵기에 따른 가로 코수 계산
    const gauge = gaugeData[yarnType];
    // 총 가로 코수 = (가로cm / 10) * 10cm당 가로 코수
    const targetStitches = Math.round((widthCm / 10) * gauge.sts);

    // 3) 원본 이미지 비율과 기법(코 비율)에 맞춰 세로 단수 계산
    const imgRatio = originalImage.height / originalImage.width;
    const targetRows = Math.round(targetStitches * imgRatio * techniqueRatio);

    // 4) 이미지를 코수/단수 크기로 리사이징
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    tempCanvas.width = targetStitches;
    tempCanvas.height = targetRows;
    tempCtx.drawImage(originalImage, 0, 0, targetStitches, targetRows);

    // 5) 픽셀 데이터 추출 및 색상 양자화 (비동기 흉내)
    setTimeout(() => {
        try {
            const imageData = tempCtx.getImageData(0, 0, targetStitches, targetRows);
            const pixels = getPixelArray(imageData);
            
            // K-means++ 클러스터링으로 색상 단순화
            const { palette, assignments } = kMeans(pixels, colorCount, 15);
            
            // 6) 메인 캔버스에 직접 블록(사각형) 단위로 그리기
            const pixelSize = Math.max(8, Math.min(20, Math.floor(800 / targetStitches))); 
            const renderWidth = targetStitches * pixelSize;
            const renderHeight = targetRows * pixelSize;
            
            // 좌표(숫자)를 표시하기 위한 여백 추가
            const paddingLeft = showGrid ? 30 : 0;
            const paddingTop = showGrid ? 30 : 0;
            
            canvas.width = renderWidth + paddingLeft;
            canvas.height = renderHeight + paddingTop;
            
            // 배경 초기화
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 도안 그리기 영역으로 좌표 이동
            ctx.translate(paddingLeft, paddingTop);

            // 각 픽셀(코)을 순회하며 메인 캔버스에 사각형으로 그림
            for (let y = 0; y < targetRows; y++) {
                for (let x = 0; x < targetStitches; x++) {
                    const idx = y * targetStitches + x;
                    const colorIdx = assignments[idx];
                    const color = palette[colorIdx];
                    
                    ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
                    ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
                }
            }

            // 7) 그리드 및 축 좌표(숫자) 그리기
            if (showGrid) {
                drawGridWithLabels(targetStitches, targetRows, pixelSize);
            }

            // 원상 복구 (PDF 생성 등을 위해)
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            // 8) 정보 및 색상표 업데이트
            const calcHeightCm = ((targetRows / gauge.rows) * 10).toFixed(1);
            patternInfo.textContent = `도안 크기: 가로 ${targetStitches}코 × 세로 ${targetRows}단 (약 ${widthCm}cm x ${calcHeightCm}cm)`;
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

// --- 3. 그리드 및 좌표 라벨 그리기 ---
function drawGridWithLabels(cols, rows, cellSize) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)'; 
    ctx.lineWidth = 1;
    // 1코(칸) 단위 얇은 선
    for (let x = 0; x <= cols; x++) {
        ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, rows * cellSize); ctx.stroke();
    }
    for (let y = 0; y <= rows; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(cols * cellSize, y * cellSize); ctx.stroke();
    }
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'; 
    ctx.lineWidth = 2;
    // 10코/10단 단위 굵은 선
    for (let x = 0; x <= cols; x += 10) {
        ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, rows * cellSize); ctx.stroke();
    }
    for (let y = 0; y <= rows; y += 10) {
        ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(cols * cellSize, y * cellSize); ctx.stroke();
    }
    // 외곽선
    ctx.strokeRect(0, 0, cols * cellSize, rows * cellSize);

    // --- 좌표(숫자) 그리기 ---
    ctx.fillStyle = '#334155';
    ctx.font = '12px Pretendard, sans-serif';
    
    // Y축 (단수) - 왼쪽
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let y = 0; y <= rows; y += 10) {
        // 단수는 아래에서 위로 읽기도 하지만, 이미지 렌더링 방향에 맞춰 위에서 아래로 표시
        ctx.fillText(y, -5, y * cellSize);
    }
    
    // X축 (코수) - 위쪽
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let x = 0; x <= cols; x += 10) {
        ctx.fillText(x, x * cellSize, -5);
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

        // 한국어 폰트 깨짐 방지를 위해 영어 제목 사용
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