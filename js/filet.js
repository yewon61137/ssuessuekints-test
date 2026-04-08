// filet.js - 방안뜨기 도안 생성기 (전체 재작성)

import { 
    getCurrentUser, openAuthModal, setOnAuthComplete, auth, db, storage,
    serverTimestamp, ref, uploadBytes, getDownloadURL
} from './auth.js';
import { addDoc, collection } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

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
const yarnPreset = document.getElementById('filetYarnPreset'); // 프리셋 드롭다운 추가
const resultSizeDisplay = document.getElementById('filetResultSize');
const uploadInput = document.getElementById('filetImageUpload');
const uploadWrapper = uploadInput ? uploadInput.closest('.file-upload-wrapper') : null; 
const fileNameDisplay = document.getElementById('filetFileNameDisplay');
const convertBtn = document.getElementById('filetConvertBtn');
const clearBtn = document.getElementById('filetClearBtn');
const downloadBtn = document.getElementById('filetDownloadBtn');
const saveBtn = document.getElementById('filetSaveBtn'); // 새로 추가할 버튼

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

    // 3. 단일 격자선 (분할선 제거)
    ctx.beginPath();
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    for (let x = 0; x <= gridW; x++) {
        const px = x * cellSize + 0.5;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, canvas.height);
    }
    for (let y = 0; y <= gridH; y++) {
        const py = y * cellSize + 0.5;
        ctx.moveTo(0, py);
        ctx.lineTo(canvas.width, py);
    }
    ctx.stroke();
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
    
    // 3. 채도 기준 변환
    const w = offscreen.width;
    let actualThreshold = (parseInt(inputThreshold.value) || 25) / 100;
    
    for (let row = 0; row < gridH; row++) {
        for (let col = 0; col < gridW; col++) {
            // 중앙 샘플링
            const sx = Math.floor((col + 0.5) * cellSize);
            const sy = Math.floor((row + 0.5) * cellSize);
            const idx = (sy * w + sx) * 4;
            
            const r = imgData[idx], g = imgData[idx+1], b = imgData[idx+2], a = imgData[idx+3];
            const sat = getSaturation(r, g, b);
            
            let isFilled = (a > 50 && sat >= actualThreshold);
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

if (yarnPreset) {
    const presets = {
        lace40: { sts: 48, rows: 48 },
        lace20: { sts: 38, rows: 38 },
        summer: { sts: 30, rows: 30 },
        winter: { sts: 22, rows: 22 }
    };
    yarnPreset.addEventListener('change', () => {
        const val = yarnPreset.value;
        if (val !== 'custom' && presets[val]) {
            inputSts10.value = presets[val].sts;
            inputRows10.value = presets[val].rows;
            // 수동으로 값을 넣었을 때는 input 이벤트가 발생하지 않으므로 강제 호출하거나 직접 계산 함수 실행
            inputSts10.dispatchEvent(new Event('input'));
            inputRows10.dispatchEvent(new Event('input'));
            updateSizeInfo();
        }
    });
}

function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드할 수 있습니다.');
        return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => { 
            bgImage = img;
            if (fileNameDisplay) fileNameDisplay.textContent = file.name;
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

if (uploadInput) {
    uploadInput.addEventListener('change', (e) => {
        handleFile(e.target.files[0]);
    });
}

if (uploadWrapper) {
    uploadWrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadWrapper.classList.add('dragging');
    });
    uploadWrapper.addEventListener('dragleave', () => {
        uploadWrapper.classList.remove('dragging');
    });
    uploadWrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadWrapper.classList.remove('dragging');
        handleFile(e.dataTransfer.files[0]);
    });
    // 배경 클릭 시에도 작동하도록 하되, 2중 트리거 방지
    uploadWrapper.addEventListener('click', (e) => {
        if (e.target.classList.contains('file-upload-btn') || e.target.tagName === 'LABEL') {
            // Label의 for 속성이 이미 click을 트리거하므로 여기서는 아무것도 안함
            return;
        }
        if (e.target !== uploadInput) {
            uploadInput.click();
        }
    });
}

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
        
        // 텍스트를 이미지로 변환하는 헬퍼 (한글 깨짐 방지)
        const textToImg = (text, size, isBold = false) => {
            const tCanvas = document.createElement('canvas');
            const tCtx = tCanvas.getContext('2d');
            tCtx.font = `${isBold ? 'bold ' : ''}${size * 4}px sans-serif`;
            const m = tCtx.measureText(text);
            tCanvas.width = Math.ceil(m.width) + 20;
            tCanvas.height = size * 6;
            tCtx.font = `${isBold ? 'bold ' : ''}${size * 4}px sans-serif`;
            tCtx.fillStyle = '#000';
            tCtx.textBaseline = 'middle';
            tCtx.fillText(text, 10, tCanvas.height / 2);
            return { src: tCanvas.toDataURL('image/png'), w: tCanvas.width / 10, h: tCanvas.height / 10 };
        };

        const title = textToImg('방안뜨기 도안', 18, true);
        pdf.addImage(title.src, 'PNG', margin, margin - 10, title.w, title.h);

        const summary = textToImg(`그리드: ${gridW} x ${gridH} | ${resultSizeDisplay.textContent}`, 10);
        pdf.addImage(summary.src, 'PNG', margin, margin + 5, summary.w, summary.h);

        const legend = textToImg('범례: ■ 채움(한길긴뜨기 묶음), □ 비움(방안)', 10);
        pdf.addImage(legend.src, 'PNG', margin, margin + 12, legend.w, legend.h);

        const startChain = textToImg(`시작코: ${gridW * 3 + 1} 코`, 10);
        pdf.addImage(startChain.src, 'PNG', margin, margin + 19, startChain.w, startChain.h);
        
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
                    pdf.setDrawColor(220); // 격자선 색상 (연하게)
                    pdf.rect(px, py, pdfCellSize, pdfCellSize, 'S');
                }
            }
        }
        
        const filename = prompt('파일 이름을 입력하세요', `filet_pattern_${gridW}x${gridH}`);
        if (filename) pdf.save(`${filename}.pdf`);
    } catch (e) { console.error(e); alert('PDF 생성 오류'); }
});

// --- 클라우드 저장 ---
async function saveFiletToCloud() {
    const user = auth.currentUser;
    if (!user) {
        alert('로그인이 필요합니다.');
        openAuthModal();
        return;
    }

    const patternTitle = prompt('도안 이름을 입력하세요', '방안뜨기 도안') || '방안뜨기 도안';

    const saveBtnOriginalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';

    try {
        const patternId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const basePath = `users/${user.uid}/patterns/${patternId}`;

        // 1. 썸네일 생성 및 업로드
        const thumbCanvas = document.createElement('canvas');
        const thumbScale = Math.min(1, 400 / Math.max(canvas.width, canvas.height));
        thumbCanvas.width = canvas.width * thumbScale;
        thumbCanvas.height = canvas.height * thumbScale;
        const tCtx = thumbCanvas.getContext('2d');
        tCtx.fillStyle = '#fff';
        tCtx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);
        tCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
        
        const thumbBlob = await new Promise(resolve => thumbCanvas.toBlob(resolve, 'image/jpeg', 0.8));
        const thumbRef = ref(storage, `${basePath}/pattern.png`);
        await uploadBytes(thumbRef, thumbBlob);
        const patternImageURL = await getDownloadURL(thumbRef);

        // 2. Firestore 저장
        const patternsRef = collection(db, `users/${user.uid}/patterns`);
        await addDoc(patternsRef, {
            type: 'filet',
            title: patternTitle,
            name: patternTitle,
            gridData: grid.flat(), // Firestore용 평탄화
            gridCols: gridW,       // 필드명 변경: gridW -> gridCols
            gridRows: gridH,       // 필드명 변경: gridH -> gridRows
            sts10: parseFloat(inputSts10.value) || 22,
            rows10: parseFloat(inputRows10.value) || 22,
            resultSizeText: resultSizeDisplay.textContent,
            patternImageURL: patternImageURL,
            createdAt: serverTimestamp()
        });

        alert('저장되었습니다.');
    } catch (e) {
        console.error(e);
        alert('저장 실패: ' + e.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = saveBtnOriginalText;
    }
}

saveBtn.addEventListener('click', saveFiletToCloud);

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
    // 터치 드로잉 시 화면이 스크롤되는 현상 방지
    if (e.cancelable && e.type.includes('touch')) {
        e.preventDefault();
    }
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
