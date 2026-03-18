// toolkit.js — 게이지, 균등 늘림/줄임, 도안 변환, 블로킹 계산 로직

import { initLang } from './i18n.js';
import { initAuth } from './auth.js';

// --- 상수 ---
const CM_PER_INCH = 2.54;
const HISTORY_KEY = 'toolkit_history';
const STATE_KEY   = 'toolkit_state';

// --- 상태 ---
let currentUnit = 'cm'; // 'cm' | 'inch'

// --- 요소 참조 ---
const gaugeStsInput     = document.getElementById('gaugeSts');
const gaugeRowsInput    = document.getElementById('gaugeRows');
const targetWidthInput  = document.getElementById('targetWidth');
const targetHeightInput = document.getElementById('targetHeight');
const resTotalSts       = document.getElementById('resTotalSts');
const resTotalRows      = document.getElementById('resTotalRows');
const resDimsCm         = document.getElementById('resDimsCm');
const resDimsInch       = document.getElementById('resDimsInch');

const convPatternStsInput  = document.getElementById('convPatternSts');
const convPatternRowsInput = document.getElementById('convPatternRows');
const convInputStsInput    = document.getElementById('convInputSts');
const convInputRowsInput   = document.getElementById('convInputRows');
const convResSts           = document.getElementById('convResSts');
const convResRows          = document.getElementById('convResRows');

const currentStsInput    = document.getElementById('currentSts');
const shapingAmountInput = document.getElementById('shapingAmount');
const shapingTypeSelect  = document.getElementById('shapingType');
const resFinalSts        = document.getElementById('resFinalSts');
const shapingInstruction = document.getElementById('shapingInstruction');

// --- 다국어 ---
const DIFF_T = {
    ko: {
        rateW: '가로 변화', rateH: '세로 변화', castOn: '뜰 치수',
        patternBar: '도안 게이지', myBar: '내 게이지',
        diff: (pct) => `내 게이지가 도안보다 ${Math.abs(pct).toFixed(1)}% ${pct > 0 ? '더 촘촘합니다' : '더 성깁니다'}`,
    },
    en: {
        rateW: 'Width change', rateH: 'Height change', castOn: 'Cast-on size',
        patternBar: 'Pattern gauge', myBar: 'My gauge',
        diff: (pct) => `Your gauge is ${Math.abs(pct).toFixed(1)}% ${pct > 0 ? 'tighter' : 'looser'} than the pattern`,
    },
    ja: {
        rateW: '幅の変化', rateH: '丈の変化', castOn: '編み始めサイズ',
        patternBar: '編み図ゲージ', myBar: '自分のゲージ',
        diff: (pct) => `自分のゲージは編み図より ${Math.abs(pct).toFixed(1)}% ${pct > 0 ? '目が詰まっています' : '目が粗いです'}`,
    },
};

const HIST_T = {
    ko: { title: '최근 계산 이력', clear: '삭제' },
    en: { title: 'Recent History',  clear: 'Clear' },
    ja: { title: '最近の履歴',       clear: '削除' },
};

// ==============================
// localStorage 상태 저장 / 복원
// ==============================
function saveState() {
    try {
        localStorage.setItem(STATE_KEY, JSON.stringify({
            gaugeSts: gaugeStsInput.value,
            gaugeRows: gaugeRowsInput.value,
            targetWidth: targetWidthInput.value,
            targetHeight: targetHeightInput.value,
            convPatternSts: convPatternStsInput.value,
            convPatternRows: convPatternRowsInput.value,
            convInputSts: convInputStsInput.value,
            convInputRows: convInputRowsInput.value,
            currentSts: currentStsInput.value,
            shapingAmount: shapingAmountInput.value,
            shapingType: shapingTypeSelect.value,
            unit: currentUnit,
        }));
    } catch(e) {}
}

function restoreState() {
    try {
        const raw = localStorage.getItem(STATE_KEY);
        if (!raw) return;
        const s = JSON.parse(raw);
        const set = (el, val) => { if (el && val != null) el.value = val; };
        set(gaugeStsInput,      s.gaugeSts);
        set(gaugeRowsInput,     s.gaugeRows);
        set(targetWidthInput,   s.targetWidth);
        set(targetHeightInput,  s.targetHeight);
        set(convPatternStsInput, s.convPatternSts);
        set(convPatternRowsInput,s.convPatternRows);
        set(convInputStsInput,  s.convInputSts);
        set(convInputRowsInput, s.convInputRows);
        set(currentStsInput,    s.currentSts);
        set(shapingAmountInput, s.shapingAmount);
        if (s.shapingType) shapingTypeSelect.value = s.shapingType;
        if (s.unit && s.unit !== 'cm') setUnit(s.unit, false);
    } catch(e) {}
}

// ==============================
// 계산 이력 (게이지 계산기)
// ==============================
function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
    catch(e) { return []; }
}

let histDebounce = null;
function scheduleHistory(entry) {
    clearTimeout(histDebounce);
    histDebounce = setTimeout(() => {
        const hist = getHistory();
        // 가장 최근과 동일하면 스킵
        if (hist.length && hist[0].gSts === entry.gSts && hist[0].gRows === entry.gRows
                        && hist[0].tW  === entry.tW  && hist[0].tH   === entry.tH) return;
        hist.unshift(entry);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(0, 5))); } catch(e) {}
        renderHistory();
    }, 900);
}

function renderHistory() {
    const el = document.getElementById('gaugeHistory');
    if (!el) return;
    const hist = getHistory();
    const lang = document.documentElement.lang || 'ko';
    const l = HIST_T[lang] || HIST_T.ko;
    if (!hist.length) { el.innerHTML = ''; return; }
    el.innerHTML = `<div class="history-header">
        <span>${l.title}</span>
        <button class="history-clear-btn" id="clearHistory">${l.clear}</button>
    </div>
    ${hist.map((h, i) => `<div class="history-item">
        <span class="history-num">${i + 1}</span>
        <span>${h.gSts} × ${h.gRows} /10cm</span>
        <span>${h.tW} × ${h.tH} ${h.unit || 'cm'}</span>
        <span class="history-result">${h.sts} sts × ${h.rows} rows</span>
    </div>`).join('')}`;
    document.getElementById('clearHistory')?.addEventListener('click', () => {
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
    });
}

// ==============================
// 단위 전환 (cm ↔ inch)
// ==============================
function setUnit(unit, save = true) {
    if (unit === currentUnit) return;
    const factor = unit === 'inch' ? 1 / CM_PER_INCH : CM_PER_INCH;
    [targetWidthInput, targetHeightInput].forEach(inp => {
        const v = parseFloat(inp.value);
        if (v > 0) inp.value = parseFloat((v * factor).toFixed(2));
    });
    currentUnit = unit;
    document.getElementById('unitCm')?.classList.toggle('active', unit === 'cm');
    document.getElementById('unitInch')?.classList.toggle('active', unit === 'inch');
    document.querySelectorAll('.gauge-unit-label').forEach(el => {
        el.textContent = unit === 'cm' ? 'cm' : 'inch';
    });
    if (save) saveState();
    calculateGauge();
}

// ==============================
// 1. 게이지 계산
// ==============================
function calculateGauge() {
    const gSts  = parseFloat(gaugeStsInput.value)  || 0;
    const gRows = parseFloat(gaugeRowsInput.value) || 0;
    const tValW = parseFloat(targetWidthInput.value)  || 0;
    const tValH = parseFloat(targetHeightInput.value) || 0;

    // cm로 내부 환산
    const tW = currentUnit === 'inch' ? tValW * CM_PER_INCH : tValW;
    const tH = currentUnit === 'inch' ? tValH * CM_PER_INCH : tValH;

    let totalSts = 0, totalRows = 0;
    if (gSts > 0 && tW > 0) {
        totalSts = Math.round((tW / 10) * gSts);
        resTotalSts.textContent = totalSts;
    } else {
        resTotalSts.textContent = '0';
    }
    if (gRows > 0 && tH > 0) {
        totalRows = Math.round((tH / 10) * gRows);
        resTotalRows.textContent = totalRows;
    } else {
        resTotalRows.textContent = '0';
    }

    // 이중 단위 표시
    if (tW > 0 && tH > 0) {
        if (resDimsCm)   resDimsCm.textContent   = `${tW.toFixed(1)} × ${tH.toFixed(1)} cm`;
        if (resDimsInch) resDimsInch.textContent = `${(tW / CM_PER_INCH).toFixed(1)}" × ${(tH / CM_PER_INCH).toFixed(1)}"`;
    }

    saveState();
    if (totalSts > 0 && totalRows > 0) {
        scheduleHistory({ gSts, gRows, tW: tValW, tH: tValH, unit: currentUnit, sts: totalSts, rows: totalRows });
    }
}

// ==============================
// 2. 도안 변환 + 게이지 바 + 차이 %
// ==============================
function calculateConversion() {
    const pSts   = parseFloat(convPatternStsInput.value)  || 0;
    const pRows  = parseFloat(convPatternRowsInput.value) || 0;
    const mySts  = parseFloat(gaugeStsInput.value)  || 0;
    const myRows = parseFloat(gaugeRowsInput.value) || 0;
    const inSts  = parseFloat(convInputStsInput.value)  || 0;
    const inRows = parseFloat(convInputRowsInput.value) || 0;

    if (pSts > 0 && mySts > 0 && inSts > 0)
        convResSts.textContent = Math.round((inSts / pSts) * mySts);
    else convResSts.textContent = '0';

    if (pRows > 0 && myRows > 0 && inRows > 0)
        convResRows.textContent = Math.round((inRows / pRows) * myRows);
    else convResRows.textContent = '0';

    updateGaugeBar(pSts, mySts);
    saveState();
}

function updateGaugeBar(pSts, mySts) {
    const barArea  = document.getElementById('gaugeBarArea');
    const diffArea = document.getElementById('gaugeDiffArea');
    if (!barArea || !diffArea) return;
    if (!pSts || !mySts) { barArea.innerHTML = ''; diffArea.innerHTML = ''; return; }

    const lang = document.documentElement.lang || 'ko';
    const l    = DIFF_T[lang] || DIFF_T.ko;
    const diffPct = ((mySts - pSts) / pSts) * 100;

    const maxSts  = Math.max(pSts, mySts);
    const pBarW   = (pSts  / maxSts * 100).toFixed(1);
    const myBarW  = (mySts / maxSts * 100).toFixed(1);

    barArea.innerHTML = `
        <div class="gauge-bar-label">${l.patternBar}: <b>${pSts}</b> sts / 10cm</div>
        <div class="gauge-bar-track"><div class="gauge-bar-fill pattern-bar" style="width:${pBarW}%"></div></div>
        <div class="gauge-bar-label" style="margin-top:0.5rem">${l.myBar}: <b>${mySts}</b> sts / 10cm</div>
        <div class="gauge-bar-track"><div class="gauge-bar-fill my-bar" style="width:${myBarW}%"></div></div>`;

    const sign = diffPct > 0 ? '+' : '';
    const cls  = Math.abs(diffPct) < 0.1 ? 'diff-equal' : diffPct > 0 ? 'diff-tighter' : 'diff-looser';
    diffArea.innerHTML = `<div class="gauge-diff-badge ${cls}">${sign}${diffPct.toFixed(1)}% &nbsp; ${l.diff(diffPct)}</div>`;
}

// ==============================
// 3. 균등 늘림/줄임
// ==============================
function calculateShaping() {
    const current = parseInt(currentStsInput.value)    || 0;
    const amount  = parseInt(shapingAmountInput.value) || 0;
    const type    = shapingTypeSelect.value;
    const lang    = document.documentElement.lang || 'ko';

    if (current <= 0 || amount <= 0) {
        resFinalSts.textContent = '-';
        shapingInstruction.textContent = '';
        return;
    }

    const finalSts = type === 'inc' ? current + amount : current - amount;
    resFinalSts.textContent = finalSts;

    if (type === 'dec' && current <= amount) {
        shapingInstruction.textContent =
            lang === 'ko' ? '줄일 코 수가 현재 코 수보다 많을 수 없습니다.'
          : lang === 'ja' ? '減らし目が現在の目数を超えています。'
          : 'Amount to decrease cannot exceed current stitches.';
        return;
    }

    const gap       = Math.floor(current / amount);
    const remainder = current % amount;
    let text = '';

    if (lang === 'ko') {
        text = `[작업 지침]\n총 ${amount}코를 균등하게 ${type === 'inc' ? '늘립니다' : '줄입니다'}.\n\n`;
        text += remainder === 0
            ? `${gap}코마다 1번씩 수행하세요.`
            : `${gap + 1}코마다 1번씩 총 ${remainder}번,\n${gap}코마다 1번씩 총 ${amount - remainder}번 수행하세요.`;
    } else if (lang === 'ja') {
        text = `[作業指針]\n計 ${amount}目を均等に${type === 'inc' ? '増やします' : '減らします'}。\n\n`;
        text += remainder === 0
            ? `${gap}目ごとに1回ずつ行ってください。`
            : `${gap + 1}目ごとに1回を ${remainder}回、\n${gap}目ごとに1回を ${amount - remainder}回行ってください。`;
    } else {
        text = `[Instruction]\n${type === 'inc' ? 'Increase' : 'Decrease'} ${amount} sts evenly.\n\n`;
        text += remainder === 0
            ? `Every ${gap} sts, ${type === 'inc' ? 'Inc' : 'Dec'} 1.`
            : `Every ${gap + 1} sts, ${type === 'inc' ? 'Inc' : 'Dec'} 1 (${remainder}×),\nEvery ${gap} sts, ${type === 'inc' ? 'Inc' : 'Dec'} 1 (${amount - remainder}×).`;
    }
    shapingInstruction.textContent = text;
    saveState();
}

// ==============================
// 4. 블로킹 계산기
// ==============================
function calculateBlocking() {
    const preW  = parseFloat(document.getElementById('blockPreWidth')?.value)    || 0;
    const preH  = parseFloat(document.getElementById('blockPreHeight')?.value)   || 0;
    const postW = parseFloat(document.getElementById('blockPostWidth')?.value)   || 0;
    const postH = parseFloat(document.getElementById('blockPostHeight')?.value)  || 0;
    const tgtW  = parseFloat(document.getElementById('blockTargetWidth')?.value) || 0;
    const tgtH  = parseFloat(document.getElementById('blockTargetHeight')?.value)|| 0;

    const rateDisplay   = document.getElementById('blockRateDisplay');
    const castOnDisplay = document.getElementById('blockCastOnDisplay');
    if (!rateDisplay) return;

    if (!preW || !preH || !postW || !postH) {
        rateDisplay.textContent = '-';
        if (castOnDisplay) castOnDisplay.textContent = '';
        return;
    }

    const lang  = document.documentElement.lang || 'ko';
    const l     = DIFF_T[lang] || DIFF_T.ko;
    const rateW = (postW - preW) / preW * 100;
    const rateH = (postH - preH) / preH * 100;
    const signW = rateW >= 0 ? '+' : '';
    const signH = rateH >= 0 ? '+' : '';

    rateDisplay.textContent = `${l.rateW}: ${signW}${rateW.toFixed(1)}%  |  ${l.rateH}: ${signH}${rateH.toFixed(1)}%`;

    if (castOnDisplay && tgtW > 0 && tgtH > 0) {
        const castW = rateW !== 0 ? (tgtW / (1 + rateW / 100)).toFixed(1) : tgtW.toFixed(1);
        const castH = rateH !== 0 ? (tgtH / (1 + rateH / 100)).toFixed(1) : tgtH.toFixed(1);
        castOnDisplay.textContent = `${l.castOn}: ${castW} × ${castH} cm`;
    } else if (castOnDisplay) {
        castOnDisplay.textContent = '';
    }
}

// ==============================
// 이벤트 리스너
// ==============================
[gaugeStsInput, gaugeRowsInput, targetWidthInput, targetHeightInput].forEach(el => {
    el.addEventListener('input', () => { calculateGauge(); calculateConversion(); });
});
[convPatternStsInput, convPatternRowsInput, convInputStsInput, convInputRowsInput].forEach(el => {
    el.addEventListener('input', calculateConversion);
});
[currentStsInput, shapingAmountInput, shapingTypeSelect].forEach(el => {
    el.addEventListener('input', calculateShaping);
});
['blockPreWidth','blockPreHeight','blockPostWidth','blockPostHeight','blockTargetWidth','blockTargetHeight']
    .forEach(id => document.getElementById(id)?.addEventListener('input', calculateBlocking));

document.getElementById('unitCm')?.addEventListener('click', () => setUnit('cm'));
document.getElementById('unitInch')?.addEventListener('click', () => setUnit('inch'));

// 언어 변경 시 재렌더링
window.addEventListener('langChange', () => {
    renderHistory();
    calculateShaping();
    calculateConversion(); // 바 레이블 갱신
    calculateBlocking();
});

// ==============================
// 초기화
// ==============================
document.addEventListener('DOMContentLoaded', () => {
    initLang({
        pageTitles: { ko: '게이지 계산기', en: 'Gauge Calculator', ja: 'ゲージ計算機' }
    });
    initAuth();
    restoreState();
    calculateGauge();
    calculateConversion();
    calculateShaping();
    calculateBlocking();
    renderHistory();
});
