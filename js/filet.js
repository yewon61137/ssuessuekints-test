// filet.js - 방안뜨기 도안 생성기 (전체 재작성)

import { getCurrentUser, openAuthModal, setOnAuthComplete } from './auth.js';

// --- 상태 관리 ---
let grid = []; // 2D array (0: 빈칸, 1: 채움칸, -1: 비활성칸)
let gridW = 30;
let gridH = 30;
let cellSize = 20;
let isDrawing = false;
let drawMode = 1; 
let bgImage = null;

// --- DOM 요소 ---
const canvas = document.getElementById('filetCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const container = document.querySelector('.filet-wrapper');
const inputGridW = document.getElementById('filetGridW');
const inputGridH = document.getElementById('filetGridH');
const inputThreshold = document.getElementById('filetThreshold'); // 여기서는 채도 임계값으로 사용 (0~100)
const inputSts10 = document.getElementById('filetSts10');
const inputRows10 = document.getElementById('filetRows10');
const resultSizeDisplay = document.getElementById('filetResultSize');
const uploadInput = document.getElementById('filetImageUpload');
const convertBtn = document.getElementById('filetConvertBtn');
const clearBtn = document.getElementById('filetClearBtn');
const downloadBtn = document.getElementById('filetDownloadBtn');

// --- 초기화 ---
export function initFiletEditor() {
    if (!ctx || !container) return;
    
    gridW = parseInt(inputGridW.value) || 30;
    gridH = parseInt(inputGridH.value) || 30;
    
    // cellSize 결정: 컨테이너 너비를 채우도록 계산
    const containerW = container.clientWidth - 40; // 여백 제외
    cellSize = Math.floor(containerW / gridW);
    if (cellSize < 5) cellSize = 5; // 최소 크기 보장
    
    // Canvas 크기 명시 설정 및 스타일 교정
    canvas.width = gridW * cellSize;
    canvas.height = gridH * cellSize;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    
    // 그리드 데이터 유지 및 확장
    const newGrid = [];
    for (let y = 0; y < gridH; y++) {
        newGrid[y] = [];
        for (let x = 0; x < gridW; x++) {
            newGrid[y][x] = (grid[y] && grid[y][x] !== undefined) ? grid[y][x] : 0;
        }
    }
    grid = newGrid;
    
    render();
    updateSizeInfo();
}
window.initFiletEditor = initFiletEditor;

// --- 렌더링 ---
function render() {
    if (!ctx) return;

    // 1. 배경 클리어
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. 칸 렌더링 (채움 및 비활성)
    for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
            const val = grid[y][x];
            if (val === -1) {
                // 비활성: 옅은 회색
                ctx.fillStyle = '#f5f5f5';
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            } else if (val === 1) {
                // 채움: 검정색 (분할선 없이 꽉 채움)
                ctx.fillStyle = '#000';
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
    }

    // 3. 가이드 격자선
    ctx.beginPath();
    ctx.lineWidth = 1;
    for (let x = 0; x <= gridW; x++) {
        const px = x * cellSize + 0.5;
        ctx.strokeStyle = (x % 10 === 0) ? '#666' : '#eee';
        ctx.moveTo(px, 0);
        ctx.lineTo(px, canvas.height);
        ctx.stroke();
        ctx.beginPath(); // 각 선마다 스타일 적용 위해 분리
    }
    for (let y = 0; y <= gridH; y++) {
        const py = y * cellSize + 0.5;
        ctx.strokeStyle = (y % 10 === 0) ? '#666' : '#eee';
        ctx.moveTo(0, py);
        ctx.lineTo(canvas.width, py);
        ctx.stroke();
        ctx.beginPath();
    }
}

// --- 유틸리티: 채도 및 밝기 ---
function getSaturation(r, g, b) {
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2;
    if (max === min) return 0;
    return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
}

function getBrightness(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

// --- 이미지 변환 ---
function convertImageToGrid() {
    if (!bgImage) { alert('이미지를 먼저 업로드해 주세요.'); return; }
    
    // 1. Offscreen Canvas 생성 (Canvas 크기 그대로 사용)
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
    
    // 2. 이미지 전체 채우기
    offCtx.drawImage(bgImage, 0, 0, offscreen.width, offscreen.height);
    const imgData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height).data;
    
    // 3. 네 모서리 평균 밝기로 배경 체크
    const w = offscreen.width;
    const h = offscreen.height;
    const corners = [[0,0], [w-1, 0], [0, h-1], [w-1, h-1]];
    let totalB = 0;
    corners.forEach(([cx, cy]) => {
        const i = (cy * w + cx) * 4;
        totalB += getBrightness(imgData[i], imgData[i+1], imgData[i+2]);
    });
    const isDarkBg = (totalB / 4) < 128;
    
    // 4. 채도 기준 변환
    const threshold = (parseInt(inputThreshold.value) || 25) / 100; // 25 -> 0.25
    
    for (let row = 0; row < gridH; row++) {
        for (let col = 0; col < gridW; col++) {
            // 중앙 샘플링
            const sx = Math.floor((col + 0.5) * cellSize);
            const sy = Math.floor((row + 0.5) * cellSize);
            const idx = (sy * w + sx) * 4;
            
            const r = imgData[idx], g = imgData[idx+1], b = imgData[idx+2], a = imgData[idx+3];
            const sat = getSaturation(r, g, b);
            
            // 임계값 처리: HTML 슬라이더가 0~255일 수도 있으므로 0.5 이상이면 비율로 변환
            let actualThreshold = (parseInt(inputThreshold.value) || 25);
            if (actualThreshold > 1) actualThreshold = actualThreshold / 255;
            else actualThreshold = actualThreshold; // 이미 0~1 범위면 유지

            let isFilled = (a > 50 && sat >= actualThreshold);
            
            // 어두운 배경일 경우 로직 반전
            if (isDarkBg) isFilled = !isFilled;
            
            grid[row][col] = isFilled ? 1 : 0;
        }
    }
    
    render();
}

// --- 기타 기능 ---
function updateSizeInfo() {
    if (!resultSizeDisplay) return;
    const sts10 = parseFloat(inputSts10.value) || 22;
    const rows10 = parseFloat(inputRows10.value) || 22;
    const chainSts = gridW * 3 + 1;
    const widthCm = (chainSts / sts10) * 10;
    const heightCm = (gridH / rows10) * 10;
    resultSizeDisplay.textContent = `${gridW}칸 × ${gridH}단 | 시작코 ${chainSts}코 | ${widthCm.toFixed(1)}cm × ${heightCm.toFixed(1)}cm`;
}

// --- 이벤트 바인딩 ---
inputGridW.addEventListener('input', initFiletEditor);
inputGridH.addEventListener('input', initFiletEditor);
inputSts10.addEventListener('input', updateSizeInfo);
inputRows10.addEventListener('input', updateSizeInfo);

uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => { bgImage = img; };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    document.getElementById('filetFileNameDisplay').textContent = file.name;
});

convertBtn.addEventListener('click', convertImageToGrid);
clearBtn.addEventListener('click', () => {
    if (confirm('그리드를 초기화하시겠습니까?')) {
        grid = grid.map(row => row.fill(0));
        render();
    }
});

downloadBtn.addEventListener('click', () => {
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const margin = 20;
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        pdf.setFontSize(18);
        pdf.text('Filet Crochet Pattern', margin, margin);
        pdf.setFontSize(10);
        pdf.text(`Grid: ${gridW} x ${gridH} | Size: ${resultSizeDisplay.textContent}`, margin, margin + 10);
        pdf.text('■: 3 DC | □: 1 DC + 2 ch', margin, margin + 16);
        pdf.text(`Start Chain: ${gridW * 3 + 1} sts`, margin, margin + 22);
        
        const chartAreaW = pdfWidth - margin * 2;
        const chartAreaH = pdfHeight - margin * 2 - 30;
        let pdfCellSize = Math.min(chartAreaW / gridW, chartAreaH / gridH);
        const startX = margin;
        const startY = margin + 30;
        
        for (let y = 0; y < gridH; y++) {
            for (let x = 0; x < gridW; x++) {
                const val = grid[y][x];
                const px = startX + x * pdfCellSize;
                const py = startY + y * pdfCellSize;
                if (val === 1) {
                    pdf.setFillColor(0);
                    pdf.rect(px, py, pdfCellSize, pdfCellSize, 'F');
                } else if (val === 0) {
                    pdf.setDrawColor(200);
                    pdf.rect(px, py, pdfCellSize, pdfCellSize, 'S');
                }
            }
        }
        
        pdf.setDrawColor(100);
        pdf.setLineWidth(0.3);
        for (let x = 0; x <= gridW; x += 10) {
            pdf.line(startX + x * pdfCellSize, startY, startX + x * pdfCellSize, startY + gridH * pdfCellSize);
        }
        for (let y = 0; y <= gridH; y += 10) {
            pdf.line(startX, startY + y * pdfCellSize, startX + gridW * pdfCellSize, startY + y * pdfCellSize);
        }
        
        const filename = prompt('파일 이름을 입력하세요', `filet_pattern_${gridW}x${gridH}`);
        if (filename) pdf.save(`${filename}.pdf`);
    } catch (e) { console.error(e); alert('PDF 생성 오류'); }
});

// 마우스 드로잉
function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    let cx, cy;
    if (e.touches) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
    else { cx = e.clientX; cy = e.clientY; }
    const x = Math.floor((cx - rect.left) / (rect.width / gridW));
    const y = Math.floor((cy - rect.top) / (rect.height / gridH));
    return { x, y };
}

function handleStart(e) {
    const { x, y } = getPos(e);
    if (x >= 0 && x < gridW && y >= 0 && y < gridH) {
        e.preventDefault();
        isDrawing = true;
        if (grid[y][x] === 0) drawMode = 1;
        else if (grid[y][x] === 1) drawMode = -1;
        else drawMode = 0;
        grid[y][x] = drawMode;
        render();
    }
}
function handleMove(e) {
    if (!isDrawing) return;
    const { x, y } = getPos(e);
    if (x >= 0 && x < gridW && y >= 0 && y < gridH) {
        if (grid[y][x] !== drawMode) {
            grid[y][x] = drawMode;
            render();
        }
    }
}
canvas.addEventListener('mousedown', handleStart);
window.addEventListener('mousemove', handleMove);
window.addEventListener('mouseup', () => isDrawing = false);
canvas.addEventListener('touchstart', handleStart, { passive: false });
canvas.addEventListener('touchmove', handleMove, { passive: false });
canvas.addEventListener('touchend', () => isDrawing = false);

window.addEventListener('resize', initFiletEditor);

initFiletEditor();
