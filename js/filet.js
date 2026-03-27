// filet.js - 방안뜨기 도안 생성기 로직 (3상태: 채움, 빔, 비활성)

import { getCurrentUser, openAuthModal, setOnAuthComplete } from './auth.js';

// --- 상태 관리 ---
let grid = []; // 2D array (0: 빈칸, 1: 채움칸, -1: 비활성칸)
let gridW = 30;
let gridH = 30;
let isDrawing = false;
let drawMode = 1; 
let bgImage = null;

// --- DOM 요소 ---
const canvas = document.getElementById('filetCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const inputGridW = document.getElementById('filetGridW');
const inputGridH = document.getElementById('filetGridH');
const inputThreshold = document.getElementById('filetThreshold');
const inputSts10 = document.getElementById('filetSts10');
const inputRows10 = document.getElementById('filetRows10');
const resultSizeDisplay = document.getElementById('filetResultSize');
const uploadInput = document.getElementById('filetImageUpload');
const convertBtn = document.getElementById('filetConvertBtn');
const clearBtn = document.getElementById('filetClearBtn');
const downloadBtn = document.getElementById('filetDownloadBtn');

const CELL_SIZE = 20; 

// --- 초기화 ---
export function initFiletEditor() {
    if (!ctx) return;
    
    const newW = parseInt(inputGridW.value) || 30;
    const newH = parseInt(inputGridH.value) || 30;
    
    if (newW !== gridW || newH !== gridH || grid.length === 0) {
        const newGrid = [];
        for (let y = 0; y < newH; y++) {
            newGrid[y] = [];
            for (let x = 0; x < newW; x++) {
                newGrid[y][x] = (grid[y] && grid[y][x] !== undefined) ? grid[y][x] : 0;
            }
        }
        grid = newGrid;
        gridW = newW;
        gridH = newH;
    }
    
    render();
    updateSizeInfo();
}

window.initFiletEditor = initFiletEditor;

// --- 렌더링 ---
function render() {
    if (!ctx) return;

    canvas.width = gridW * CELL_SIZE;
    canvas.height = gridH * CELL_SIZE;

    // 1. 흰 배경
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. 비활성칸 (회색 fill)
    ctx.fillStyle = '#f0f0f0';
    for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
            if (grid[y][x] === -1) {
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    }

    // 3. 채워진 칸 (■)
    ctx.fillStyle = '#000';
    for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
            if (grid[y][x] === 1) {
                ctx.fillRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
            }
        }
    }

    // 4. 격자선 — 경계마다 한 번씩만 그림 (strokeRect 중복 제거), +0.5로 안티얼라이싱 없앰
    ctx.beginPath();
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    for (let x = 0; x <= gridW; x++) {
        const px = x * CELL_SIZE + 0.5;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, canvas.height);
    }
    for (let y = 0; y <= gridH; y++) {
        const py = y * CELL_SIZE + 0.5;
        ctx.moveTo(0, py);
        ctx.lineTo(canvas.width, py);
    }
    ctx.stroke();
}

// --- 크기 계산 및 표시 ---
function updateSizeInfo() {
    if (!resultSizeDisplay) return;
    
    const sts10 = parseFloat(inputSts10.value) || 22;
    const rows10 = parseFloat(inputRows10.value) || 22;
    
    // 시작코 = 칸수 * 3 + 1
    const totalSts = gridW * 3 + 1;
    const totalRows = gridH + 1; 
    
    const widthCm = (totalSts / sts10) * 10;
    const heightCm = (totalRows / rows10) * 10;
    
    if (isNaN(widthCm) || isNaN(heightCm)) {
        resultSizeDisplay.textContent = '--- cm × --- cm';
    } else {
        resultSizeDisplay.textContent = `${widthCm.toFixed(1)}cm × ${heightCm.toFixed(1)}cm (${totalSts} sts × ${totalRows} rows)`;
    }
}

// --- 이벤트 리스너 ---

if (inputGridW) {
    [inputGridW, inputGridH, inputSts10, inputRows10].forEach(el => {
        el.addEventListener('input', initFiletEditor);
    });
}

function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    const x = Math.floor((clientX - rect.left) / (rect.width / gridW));
    const y = Math.floor((clientY - rect.top) / (rect.height / gridH));
    return { x, y };
}

function handleStart(e) {
    if (!ctx) return;
    const { x, y } = getPos(e);
    if (x >= 0 && x < gridW && y >= 0 && y < gridH) {
        e.preventDefault();
        isDrawing = true;
        // 0 (빈칸) -> 1 (채움) -> -1 (비활성) -> 0 순환
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

function handleEnd() {
    isDrawing = false;
}

if (canvas) {
    canvas.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('touchstart', handleStart, { passive: false });
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    canvas.addEventListener('touchend', handleEnd);
}

// 이미지 업로드
if (uploadInput) {
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
        const display = document.getElementById('filetFileNameDisplay');
        if (display) display.textContent = file.name;
    });
}

// 이미지 -> 그리드 변환
if (convertBtn) {
    convertBtn.addEventListener('click', () => {
        if (!bgImage) { alert('이미지를 업로드하세요.'); return; }
        const threshold = parseInt(inputThreshold.value);
        const destW = gridW * CELL_SIZE;
        const destH = gridH * CELL_SIZE;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = destW;
        tempCanvas.height = destH;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        tempCtx.drawImage(bgImage, 0, 0, destW, destH);
        const imgData = tempCtx.getImageData(0, 0, destW, destH).data;
        const half = Math.floor(CELL_SIZE / 2);
        for (let y = 0; y < gridH; y++) {
            for (let x = 0; x < gridW; x++) {
                const px = x * CELL_SIZE + half;
                const py = y * CELL_SIZE + half;
                const idx = (py * destW + px) * 4;
                const brightness = (0.299 * imgData[idx] + 0.587 * imgData[idx+1] + 0.114 * imgData[idx+2]);
                const alpha = imgData[idx+3];
                if (alpha < 50 || brightness >= 240) {
                    grid[y][x] = -1; // 투명 or 흰색 배경 → 비활성
                } else if (brightness < threshold) {
                    grid[y][x] = 0;  // 피사체 내 어두운 부분 → 빈칸
                } else {
                    grid[y][x] = 1;  // 피사체 실루엣 → 채움칸
                }
            }
        }
        render();
    });
}

// 초기화 버튼
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        if (confirm('그리드를 초기화하시겠습니까?')) {
            grid = grid.map(row => row.fill(0));
            render();
        }
    });
}

// PDF 다운로드
if (downloadBtn) {
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
            
            // 격자 및 내용 그리기
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
                    // -1 (비활성)은 아무것도 안 그림 (흰색)
                }
            }
            
            // 10단위 선 (굵게)
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
        } catch (e) {
            console.error(e);
            alert('PDF 생성 오류');
        }
    });
}

// 초기 실행
initFiletEditor();
