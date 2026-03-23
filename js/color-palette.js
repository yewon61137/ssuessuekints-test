import { auth, db, initAuth, openAuthModal } from './auth.js';
import { initLang } from './i18n.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  collection, addDoc, getDocs, doc, deleteDoc, updateDoc,
  query, orderBy, limit, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// ─── i18n ────────────────────────────────────────────────────────────────────

const pageT = {
  cp_tab_simulator: { ko: '색상 시뮬레이터', en: 'Color Simulator', ja: 'カラーシミュレーター' },
  cp_tab_stripe:    { ko: '줄무늬 계산기', en: 'Stripe Calculator', ja: 'ストライプ計算機' },

  cp_add_color:   { ko: '색상 추가', en: 'Add Color', ja: '色を追加' },
  cp_remove:      { ko: '제거', en: 'Remove', ja: '削除' },

  cp_tex_stk: { ko: '메리야스', en: 'Stockinette', ja: 'メリヤス' },
  cp_tex_gtr: { ko: '가터', en: 'Garter', ja: 'ガーター' },
  cp_tex_str: { ko: '줄무늬', en: 'Stripes', ja: '縞模様' },
  cp_tex_fi:  { ko: '페어아일', en: 'Fair Isle', ja: 'フェアアイル' },
  cp_tex_int: { ko: '인타샤', en: 'Intarsia', ja: 'インタルシア' },

  cp_cvd_normal: { ko: '정상', en: 'Normal', ja: '通常' },
  cp_cvd_prot:   { ko: '적색약', en: 'Protanopia', ja: '赤色覚異常' },
  cp_cvd_deut:   { ko: '녹색약', en: 'Deuteranopia', ja: '緑色覚異常' },
  cp_cvd_trit:   { ko: '청색약', en: 'Tritanopia', ja: '青色覚異常' },

  cp_save_palette:      { ko: '팔레트 저장', en: 'Save Palette', ja: 'パレットを保存' },
  cp_palette_name:      { ko: '팔레트 이름', en: 'Palette Name', ja: 'パレット名' },
  cp_palette_name_prompt: { ko: '팔레트 이름을 입력하세요', en: 'Enter palette name', ja: 'パレット名を入力してください' },
  cp_saved:        { ko: '팔레트가 저장되었어요!', en: 'Palette saved!', ja: 'パレットが保存されました！' },
  cp_save_error:   { ko: '저장 중 오류가 발생했어요', en: 'Error saving palette', ja: '保存中にエラーが発生しました' },
  cp_login_to_save: { ko: '팔레트 저장은 로그인이 필요해요', en: 'Please sign in to save palettes', ja: 'パレットを保存するにはログインが必要です' },
  cp_guest_saved:  { ko: '게스트로 저장되었어요 (기기에만 보관)', en: 'Saved as guest (this device only)', ja: 'ゲストとして保存しました（このデバイスのみ）' },

  cp_all:     { ko: '전체', en: 'All', ja: 'すべて' },
  cp_spring:  { ko: '봄', en: 'Spring', ja: '春' },
  cp_summer:  { ko: '여름', en: 'Summer', ja: '夏' },
  cp_autumn:  { ko: '가을', en: 'Autumn', ja: '秋' },
  cp_winter:  { ko: '겨울', en: 'Winter', ja: '冬' },
  cp_warm:    { ko: '웜톤', en: 'Warm', ja: 'ウォーム' },
  cp_cool:    { ko: '쿨톤', en: 'Cool', ja: 'クール' },
  cp_vintage: { ko: '빈티지', en: 'Vintage', ja: 'ヴィンテージ' },
  cp_modern:  { ko: '모던', en: 'Modern', ja: 'モダン' },
  cp_pastel:  { ko: '파스텔', en: 'Pastel', ja: 'パステル' },
  cp_natural: { ko: '내추럴', en: 'Natural', ja: 'ナチュラル' },

  cp_generate:  { ko: '팔레트 생성', en: 'Generate Palettes', ja: 'パレット生成' },
  cp_colorwork: { ko: '배색뜨기', en: 'Colorwork', ja: '配色編み' },
  cp_accent:    { ko: '포인트 색상', en: 'Accent Color', ja: 'アクセントカラー' },

  cp_dist_equal:  { ko: '균등', en: 'Equal', ja: '均等' },
  cp_dist_golden: { ko: '황금비', en: 'Golden Ratio', ja: '黄金比' },
  cp_dist_fib:    { ko: '피보나치', en: 'Fibonacci', ja: 'フィボナッチ' },
  cp_dist_custom: { ko: '직접 입력', en: 'Custom', ja: 'カスタム' },

  cp_calculate:  { ko: '계산하기', en: 'Calculate', ja: '計算する' },
  cp_color:      { ko: '색상', en: 'Color', ja: '色' },
  cp_rows:       { ko: '단 수', en: 'Rows', ja: '段数' },
  cp_rows_per_color: { ko: '색상별 단수', en: 'Rows per color', ja: '色ご둔の段数' },
  cp_ratio:      { ko: '비율', en: 'Ratio', ja: '割合' },
  cp_to_simulator: { ko: '시뮬레이터로 보기', en: 'View in Simulator', ja: 'シミュレーターで見る' },

  cp_contrast_good: { ko: 'AAA — 최고의 대비예요 👍', en: 'AAA — Excellent contrast 👍', ja: 'AAA — 最高のコントラストです 👍' },
  cp_contrast_ok:   { ko: 'AA — 충분한 대비예요', en: 'AA — Good contrast', ja: 'AA — 十分なコントラストです' },
  cp_contrast_poor: { ko: '대비가 부족해 구분이 어려울 수 있어요 ⚠️', en: 'Poor contrast — may be hard to distinguish ⚠️', ja: 'コントラストが不足しています ⚠️' },

  cp_send_to_sim: { ko: '시뮬레이터로 보내기', en: 'Send to Simulator', ja: 'シミュレーターに送る' },
  cp_view_sim:    { ko: '시뮬레이터로 보기', en: 'View in Simulator', ja: 'シミュレーターで見る' },
  cp_cur_name:    { ko: '큐레이션 팔레트', en: 'Curated Palette', ja: 'キュレーションパレット' },
  cp_technique:   { ko: '기법', en: 'Technique', ja: '技法' },
};

function tr(key) {
  const lang = localStorage.getItem('lang') || 'ko';
  const entry = pageT[key];
  if (!entry) return key;
  return entry[lang] || entry.ko || key;
}

// ─── COLOR UTILITIES ─────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => {
    const h = Math.round(Math.max(0, Math.min(255, v))).toString(16);
    return h.length === 1 ? '0' + h : h;
  }).join('');
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) {
    h = 0; s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

function hslToHex(h, s, l) {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

function linearize(c) {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const R = linearize(r / 255);
  const G = linearize(g / 255);
  const B = linearize(b / 255);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(hex1, hex2) {
  const L1 = luminance(hex1);
  const L2 = luminance(hex2);
  const lighter = Math.max(L1, L2);
  const darker  = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function applyColorBlindness(hex, type) {
  if (type === 'normal') return hex;
  const matrices = {
    protanopia:  [[0.567, 0.433, 0],    [0.558, 0.442, 0],    [0, 0.242, 0.758]],
    deuteranopia:[[0.625, 0.375, 0],    [0.7,   0.3,   0],    [0, 0.3,   0.7  ]],
    tritanopia:  [[0.95,  0.05,  0],    [0,     0.433, 0.567],[0, 0.475, 0.525]],
  };
  const m = matrices[type];
  if (!m) return hex;
  const { r, g, b } = hexToRgb(hex);
  const R = r / 255, G = g / 255, B = b / 255;
  const nr = Math.min(1, Math.max(0, m[0][0]*R + m[0][1]*G + m[0][2]*B));
  const ng = Math.min(1, Math.max(0, m[1][0]*R + m[1][1]*G + m[1][2]*B));
  const nb = Math.min(1, Math.max(0, m[2][0]*R + m[2][1]*G + m[2][2]*B));
  return rgbToHex(Math.round(nr*255), Math.round(ng*255), Math.round(nb*255));
}

function shadeHex(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    Math.min(255, Math.max(0, r + amount)),
    Math.min(255, Math.max(0, g + amount)),
    Math.min(255, Math.max(0, b + amount))
  );
}

// ─── CANVAS RENDERING ────────────────────────────────────────────────────────

// 스티치 하나를 그리는 헬퍼 함수 (메리야스 코 모양)
function drawStitch(ctx, x, y, w, h, color, isPurl = false) {
  const darker = shadeHex(color, -25);
  const lighter = shadeHex(color, 20);

  // 배경 베이스
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);

  if (h >= 4) {
    if (!isPurl) {
      // V자 모양 (메리야스)
      ctx.strokeStyle = darker;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const cx = x + w / 2;
      // 왼쪽 날개
      ctx.moveTo(x + 1.5, y + 1);
      ctx.quadraticCurveTo(x + 2, y + h - 1.5, cx, y + h - 1);
      // 오른쪽 날개
      ctx.moveTo(x + w - 1.5, y + 1);
      ctx.quadraticCurveTo(x + w - 2, y + h - 1.5, cx, y + h - 1);
      ctx.stroke();
      
      // 은은한 하이라이트
      ctx.strokeStyle = lighter;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 2);
      ctx.lineTo(x + 3, y + 4);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    } else {
      // 가로 융기 모양 (가터/안뜨기)
      ctx.fillStyle = darker;
      ctx.fillRect(x, y + h - Math.max(1, h*0.2), w, Math.max(1, h*0.2));
      ctx.fillStyle = lighter;
      ctx.fillRect(x, y, w, Math.max(1, h*0.2));
    }
  }
}

// 노르딕 눈꽃 패턴 (16x16)
const NORDIC_PATTERN = [
  [0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
  [0,0,1,0,0,1,1,0,0,1,1,0,0,1,0,0],
  [0,0,0,1,0,1,0,0,0,0,1,0,1,0,0,0],
  [0,0,0,0,1,0,0,1,1,0,0,1,0,0,0,0],
  [0,0,1,1,0,0,1,1,1,1,0,0,1,1,0,0],
  [0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0],
  [1,1,0,0,1,1,0,0,0,0,1,1,0,0,1,1],
  [1,1,0,0,1,1,0,0,0,0,1,1,0,0,1,1],
  [0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0],
  [0,0,1,1,0,0,1,1,1,1,0,0,1,1,0,0],
  [0,0,0,0,1,0,0,1,1,0,0,1,0,0,0,0],
  [0,0,0,1,0,1,0,0,0,0,1,0,1,0,0,0],
  [0,0,1,0,0,1,1,0,0,1,1,0,0,1,0,0],
  [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0]
];

function renderTexture(canvas, colors, texture, stripeRows) {
  if (!canvas || !colors || colors.length === 0) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const n = colors.length;
  const colorAt = i => colors[((i % n) + n) % n];

  // 스티치 크기 (안정적인 16x14)
  const cellW = 16, cellH = 14;
  const cols = Math.ceil(W / cellW);
  const rows = Math.ceil(H / cellH);

  if (texture === 'stockinette') {
    for (let r = 0; r < rows; r++) {
      const c = colorAt(r);
      for (let l = 0; l < cols; l++) {
        drawStitch(ctx, l * cellW, r * cellH, cellW, cellH, c);
      }
    }
  } else if (texture === 'garter') {
    for (let r = 0; r < rows; r++) {
      const c = colorAt(r);
      const isPurl = r % 2 === 1; // 겉뜨기와 안뜨기(이랑) 교차
      for (let l = 0; l < cols; l++) {
        drawStitch(ctx, l * cellW, r * cellH, cellW, cellH, c, isPurl);
      }
    }
  } else if (texture === 'stripes') {
    renderStripePreview(canvas, colors, stripeRows);
  } else if (texture === 'fairisle') {
    const patSize = 16;
    const midCol = Math.floor(cols / 2);
    const midRow = Math.floor(rows / 2);

    let bgColors = [colors[0]];
    let patColors = n > 1 ? [colors[1]] : [colors[0]];
    if (n === 3) { patColors = [colors[1], colors[2]]; }
    if (n === 4) { bgColors = [colors[0], colors[1]]; patColors = [colors[2], colors[3]]; }
    if (n === 5) { bgColors = [colors[0], colors[1]]; patColors = [colors[2], colors[3], colors[4]]; }
    if (n >= 6) { bgColors = [colors[0], colors[1], colors[2]]; patColors = [colors[3], colors[4], colors[5]]; }

    for (let r = 0; r < rows; r++) {
      for (let l = 0; l < cols; l++) {
        const px = ((l - midCol + 8) % patSize + patSize) % patSize;
        const py = ((r - midRow + 8) % patSize + patSize) % patSize;
        
        const isPattern = NORDIC_PATTERN[py] && NORDIC_PATTERN[py][px] === 1;

        let curColor;
        if (!isPattern) {
            const bgIdx = Math.floor(r / 16) % bgColors.length;
            curColor = bgColors[bgIdx];
        } else {
            const rowPat = Math.floor(r / patSize);
            const patIdx = (rowPat + Math.floor(l / patSize)) % patColors.length;
            curColor = patColors[patIdx];
        }

        drawStitch(ctx, l * cellW, r * cellH, cellW, cellH, curColor);
      }
    }
  } else if (texture === 'intarsia') {
    for (let r = 0; r < rows; r++) {
      for (let l = 0; l < cols; l++) {
        const nx = (l + 0.5) / cols;
        const ny = (r + 0.5) / rows;
        let c = colors[0];

        if (n === 1) {
           c = colors[0];
        } else if (n === 2) {
           if (nx + ny > 1) c = colors[1];
        } else if (n === 3) {
           if (nx < 0.33) c = colors[0];
           else if (nx < 0.66) c = colors[1];
           else c = colors[2];
        } else if (n === 4) {
           if (nx < 0.5 && ny < 0.5) c = colors[0];
           else if (nx >= 0.5 && ny < 0.5) c = colors[1];
           else if (nx < 0.5 && ny >= 0.5) c = colors[2];
           else c = colors[3];
        } else if (n === 5) {
           if (Math.abs(nx-0.5) + Math.abs(ny-0.5) < 0.3) c = colors[4];
           else if (nx < 0.5 && ny < 0.5) c = colors[0];
           else if (nx >= 0.5 && ny < 0.5) c = colors[1];
           else if (nx < 0.5 && ny >= 0.5) c = colors[2];
           else c = colors[3];
        } else if (n >= 6) {
           const gx = Math.floor(nx * 3);
           const gy = Math.floor(ny * 2);
           c = colors[Math.min(5, gy * 3 + gx)];
        }
        drawStitch(ctx, l * cellW, r * cellH, cellW, cellH, c);
      }
    }
  }
}

function renderStripePreview(canvas, colors, rowCounts) {
  if (!canvas || !colors || colors.length === 0) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const counts = rowCounts && rowCounts.length === colors.length
    ? rowCounts
    : colors.map(() => 1);
  const totalRows = counts.reduce((a, b) => a + b, 0);
  if (totalRows === 0) return;

  const cellW = 12;
  let cellH = 10;
  if (totalRows * cellH > H) {
    cellH = H / totalRows;
  }
  const cols = Math.ceil(W / cellW);

  let currentY = 0;
  for (let i = 0; i < colors.length; i++) {
    const colorRows = counts[i];
    const c = colors[i];
    for (let r = 0; r < colorRows; r++) {
      for (let l = 0; l < cols; l++) {
        drawStitch(ctx, l * cellW, currentY, cellW, cellH + 0.5, c); // +0.5 prevents float gaps
      }
      currentY += cellH;
    }
  }
}


// ─── STATE ───────────────────────────────────────────────────────────────────

let slots = [{ hex: '#D4A8C8' }, { hex: '#7EC8C8' }];
let currentTexture = 'stockinette';
let stripeRows = [4, 4];
let cvdMode = 'normal';
let currentDist = 'equal';
let stripeCalcResult = null;
let customRowsCache = {};

// ─── SIMULATOR (TAB 1) ───────────────────────────────────────────────────────

function getPreviewColors() {
  return slots.map(s => applyColorBlindness(s.hex, cvdMode));
}

function redrawPreview() {
  const canvas = document.getElementById('simCanvas');
  if (!canvas) return;
  renderTexture(canvas, getPreviewColors(), currentTexture, stripeRows);
}

function updateContrast() {
  const el = document.getElementById('simContrast');
  if (!el) return;
  if (slots.length < 2) {
    el.textContent = '';
    el.className = 'cp-contrast';
    return;
  }
  let minRatio = Infinity;
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const ratio = contrastRatio(slots[i].hex, slots[j].hex);
      if (ratio < minRatio) minRatio = ratio;
    }
  }
  const ratio = minRatio;
  let msg, cls;
  if (ratio >= 7) {
    msg = tr('cp_contrast_good');
    cls = 'cp-contrast cp-contrast-good';
  } else if (ratio >= 4.5) {
    msg = tr('cp_contrast_ok');
    cls = 'cp-contrast cp-contrast-ok';
  } else if (ratio >= 3) {
    msg = tr('cp_contrast_ok').split('—')[0] + ' — 대비가 약간 부족해요';
    cls = 'cp-contrast cp-contrast-warning';
  } else {
    msg = tr('cp_contrast_poor');
    cls = 'cp-contrast cp-contrast-poor';
  }
  // Change label if > 2 colors
  const labelEl = document.querySelector('.cp-contrast-box .cp-contrast-label');
  if (labelEl) labelEl.textContent = slots.length > 2 ? '최저 대비비 (모든 색상 간)' : (tr('cp_contrast_label') || '대비비 (첫 두 색상)');
  el.textContent = `${ratio.toFixed(2)}:1  ${msg}`;
  el.className = cls;
}

function renderStripeSliders() {
  const container = document.getElementById('simStripeSliders');
  if (!container) return;
  if (currentTexture !== 'stripes') {
    container.style.display = 'none';
    return;
  }
  container.style.display = '';
  container.innerHTML = `<div class="cp-section-label" style="margin-bottom:0.5rem;">${tr('cp_rows_per_color') || '색상별 단수'}</div>`;
  slots.forEach((slot, i) => {
    const row = document.createElement('div');
    row.className = 'cp-stripe-slider-row';
    const swatch = document.createElement('span');
    swatch.className = 'cp-slot-swatch';
    swatch.style.background = slot.hex;
    const range = document.createElement('input');
    range.type = 'range';
    range.min = 1;
    range.max = 20;
    range.value = stripeRows[i] || 4;
    range.addEventListener('input', () => {
      stripeRows[i] = parseInt(range.value);
      valEl.textContent = `${stripeRows[i]} 단`;
      redrawPreview();
    });
    const valEl = document.createElement('span');
    valEl.className = 'cp-stripe-rows-val';
    valEl.textContent = `${stripeRows[i] || 4} 단`;
    row.appendChild(swatch);
    row.appendChild(range);
    row.appendChild(valEl);
    container.appendChild(row);
  });
}

function renderSlots() {
  const container = document.getElementById('simSlots');
  if (!container) return;
  container.innerHTML = '';

  slots.forEach((slot, i) => {
    const row = document.createElement('div');
    row.className = 'cp-slot-row';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = slot.hex;
    colorInput.className = 'cp-color-input';

    const hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.value = slot.hex;
    hexInput.maxLength = 7;
    hexInput.className = 'cp-hex-input';
    hexInput.spellcheck = false;

    colorInput.addEventListener('input', () => {
      slot.hex = colorInput.value;
      hexInput.value = colorInput.value;
      stripeRows[i] = stripeRows[i] || 4;
      redrawPreview();
      updateContrast();
      renderStripeSliders();
    });

    hexInput.addEventListener('input', () => {
      const val = hexInput.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        slot.hex = val;
        colorInput.value = val;
        redrawPreview();
        updateContrast();
        renderStripeSliders();
      }
    });

    hexInput.addEventListener('blur', () => {
      hexInput.value = slot.hex;
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'cp-remove-slot-btn secondary-btn small-btn';
    removeBtn.textContent = '×';
    removeBtn.title = tr('cp_remove');
    removeBtn.style.display = slots.length <= 2 ? 'none' : '';
    removeBtn.addEventListener('click', () => {
      slots.splice(i, 1);
      stripeRows.splice(i, 1);
      renderSlots();
      redrawPreview();
      updateContrast();
      renderStripeSliders();
      updateAddBtn();
    });

    row.appendChild(colorInput);
    row.appendChild(hexInput);
    row.appendChild(removeBtn);
    container.appendChild(row);
  });

  updateAddBtn();
}

function updateAddBtn() {
  const btn = document.getElementById('simAddColorBtn');
  if (btn) btn.disabled = slots.length >= 6;
}

function sendToSimulator(colors) {
  slots = colors.map(hex => ({ hex }));
  stripeRows = slots.map(() => 4);
  renderSlots();
  redrawPreview();
  updateContrast();
  renderStripeSliders();
  const tab = document.querySelector('.cp-tab[data-tab="simulator"]');
  if (tab) tab.click();
}



// ─── STRIPE CALCULATOR (TAB 3) ───────────────────────────────────────────────

function getStripeCalcColors() {
  const inputs = document.querySelectorAll('.cp-stripe-color-input');
  return Array.from(inputs).map(inp => inp.value);
}

function renderStripeCalcInputs() {
  const countEl = document.getElementById('stripeCalcColorCount');
  const container = document.getElementById('stripeCalcColors');
  if (!countEl || !container) return;
  const n = parseInt(countEl.value) || 3;
  container.innerHTML = '';

  const defaultColors = ['#D4A8C8', '#7EC8C8', '#F5E6B8', '#A8D4A8', '#C8A8D4', '#D4C8A8'];
  for (let i = 0; i < n; i++) {
    const row = document.createElement('div');
    row.className = 'cp-stripe-calc-color-row';

    const label = document.createElement('label');
    label.textContent = `${tr('cp_color')} ${i + 1}`;

    const colorIn = document.createElement('input');
    colorIn.type = 'color';
    colorIn.value = defaultColors[i] || '#888888';
    colorIn.className = 'cp-stripe-color-input cp-color-input';
    colorIn.dataset.idx = i;

    row.appendChild(label);
    row.appendChild(colorIn);
    container.appendChild(row);
  }
}

function showCustomInputs() {
  const container = document.getElementById('stripeCustomInputs');
  if (!container) return;
  container.style.display = '';
  const totalInp = document.getElementById('stripeCalcTotalRows');
  if (totalInp) {
    totalInp.disabled = true;
    totalInp.style.opacity = '0.7';
  }

  const colors = getStripeCalcColors();
  container.innerHTML = '';

  const updateTotal = () => {
    let sum = 0;
    document.querySelectorAll('.cp-custom-rows-input').forEach(inp => sum += (parseInt(inp.value)||0));
    if (totalInp) totalInp.value = sum;
  };

  colors.forEach((c, i) => {
    const row = document.createElement('div');
    row.className = 'cp-stripe-custom-row';
    const swatch = document.createElement('span');
    swatch.className = 'cp-slot-swatch';
    swatch.style.background = c;
    const label = document.createElement('label');
    label.textContent = `${tr('cp_color')} ${i + 1}:`;
    const numIn = document.createElement('input');
    numIn.type = 'number';
    numIn.min = 1;
    numIn.max = 200;
    numIn.value = customRowsCache[i] || 4;
    numIn.className = 'cp-custom-rows-input';
    numIn.dataset.idx = i;
    
    numIn.addEventListener('input', () => {
      customRowsCache[numIn.dataset.idx] = parseInt(numIn.value) || 0;
      updateTotal();
    });

    const unitSpan = document.createElement('span');
    unitSpan.textContent = ' 단';
    row.appendChild(swatch);
    row.appendChild(label);
    row.appendChild(numIn);
    row.appendChild(unitSpan);
    container.appendChild(row);
  });
  updateTotal();
}

function hideCustomInputs() {
  const container = document.getElementById('stripeCustomInputs');
  if (container) container.style.display = 'none';
  const totalInp = document.getElementById('stripeCalcTotalRows');
  if (totalInp) {
    totalInp.disabled = false;
    totalInp.style.opacity = '1';
  }
}

function distributeRows(n, totalRows, dist) {
  if (dist === 'custom') {
    const inputs = document.querySelectorAll('.cp-custom-rows-input');
    return Array.from(inputs).map(inp => Math.max(1, parseInt(inp.value) || 4));
  }
  
  let weights;
  if (dist === 'equal') weights = Array(n).fill(1);
  else if (dist === 'golden') weights = Array.from({length:n}, (_,i)=>Math.pow(1.618, i));
  else if (dist === 'fibonacci') {
    const fibs = [1,1,2,3,5,8];
    weights = Array.from({length:n}, (_,i) => fibs[i % fibs.length]);
  }

  const sumW = weights.reduce((a,b) => a+b, 0);
  let rows = weights.map(w => Math.round((w/sumW) * totalRows));

  for (let i = 0; i < n; i++) {
    if (rows[i] < 1) rows[i] = 1;
  }

  let currentSum = rows.reduce((a,b) => a+b, 0);
  
  while (currentSum < totalRows) {
    let maxWIdx = n - 1; 
    let maxW = 0;
    for (let i = 0; i < n; i++) { if (weights[i] > maxW) { maxW = weights[i]; maxWIdx = i; } }
    rows[maxWIdx]++;
    currentSum++;
  }
  
  while (currentSum > totalRows) {
    let maxRIdx = -1;
    let maxR = 1; // must be > 1 to decrement
    for (let i = 0; i < n; i++) {
      if (rows[i] > maxR) { maxR = rows[i]; maxRIdx = i; }
    }
    if (maxRIdx === -1) break; 
    rows[maxRIdx]--;
    currentSum--;
  }

  return rows;
}

function calculateStripes() {
  const totalRowsEl = document.getElementById('stripeCalcTotalRows');
  const container   = document.getElementById('stripeCalcResult');
  const previewCanvas = document.getElementById('stripeCalcCanvas');
  if (!totalRowsEl || !container) return;

  let totalRows = parseInt(totalRowsEl.value) || 20;
  const colors = getStripeCalcColors();
  const n = colors.length;
  if (currentDist !== 'custom' && totalRows < n) {
      totalRows = n;
      totalRowsEl.value = n;
  }
  const rowDist = distributeRows(n, totalRows, currentDist);

  stripeCalcResult = { colors, rowDist };
  container.style.display = '';

  // Update the static tbody — don't wipe the whole container (canvas + buttons live there)
  const tbody = document.getElementById('stripeCalcTableBody');
  if (tbody) {
    tbody.innerHTML = '';
    const effectiveTotal = rowDist.reduce((a, b) => a + b, 0);
    colors.forEach((c, i) => {
      const row = document.createElement('tr');

      const tdColor = document.createElement('td');
      const swatch = document.createElement('span');
      swatch.className = 'cp-slot-swatch';
      swatch.style.background = c;
      const hexSpan = document.createElement('span');
      hexSpan.textContent = ` ${c}`;
      tdColor.appendChild(swatch);
      tdColor.appendChild(hexSpan);

      const tdRows = document.createElement('td');
      tdRows.textContent = rowDist[i];

      const tdRatio = document.createElement('td');
      tdRatio.textContent = `${((rowDist[i] / effectiveTotal) * 100).toFixed(1)}%`;

      row.appendChild(tdColor);
      row.appendChild(tdRows);
      row.appendChild(tdRatio);
      tbody.appendChild(row);
    });
  }

  if (previewCanvas) {
    renderStripePreview(previewCanvas, colors, rowDist);
  }
}

function stripeToSim() {
  if (!stripeCalcResult) return;
  slots = stripeCalcResult.colors.map(hex => ({ hex }));
  stripeRows = [...stripeCalcResult.rowDist];
  currentTexture = 'stripes';
  renderSlots();
  renderStripeSliders();
  redrawPreview();
  // Update texture radio
  const radios = document.querySelectorAll('.cp-texture-btn');
  radios.forEach(r => {
    r.classList.toggle('active', r.dataset.texture === 'stripes');
  });
  document.querySelector('.cp-tab[data-tab="simulator"]')?.click();
}



// ─── PALETTE SAVE ─────────────────────────────────────────────────────────────

async function savePalette(colors, name, technique = '', season = '', mood = '') {
  const user = auth.currentUser;
  if (!user) {
    // Guest: save to localStorage, then nudge to sign in
    try {
      const key = 'ssuessue_palettes';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push({
        id: Date.now().toString(),
        name,
        colors,
        technique,
        season,
        mood,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem(key, JSON.stringify(existing));
      showToast(tr('cp_guest_saved'));
      setTimeout(() => showToast(tr('cp_login_to_save'), true), 2500);
    } catch (e) {
      showToast(tr('cp_save_error'));
    }
    return;
  }
  try {
    await addDoc(collection(db, `users/${user.uid}/palettes`), {
      name,
      colors,
      technique,
      season,
      mood,
      createdAt: serverTimestamp(),
    });
    showToast(tr('cp_saved'));
  } catch (e) {
    console.error('savePalette error:', e);
    showToast(tr('cp_save_error'));
  }
}

// ─── TOAST ────────────────────────────────────────────────────────────────────

function showToast(msg, isInfo = false) {
  const el = document.getElementById('cpToast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'cp-toast' + (isInfo ? ' cp-toast-info' : '');
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 3000);
}

// ─── TAB SWITCHING ────────────────────────────────────────────────────────────

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function initTabs() {
  document.querySelectorAll('.cp-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cp-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.cp-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panelId = 'panel' + capitalize(btn.dataset.tab);
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.add('active');
      if (btn.dataset.tab === 'simulator') {
        redrawPreview();
        renderStripeSliders();
      }
      if (btn.dataset.tab === 'curation') renderCuration('all');
    });
  });
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

initAuth();
initLang({ extra: pageT });

onAuthStateChanged(auth, user => {
  // Header UI is handled by initAuth
});

// ?palette=["#hex",...] 파라미터로 시뮬레이터 초기화
(function loadFromUrl() {
  try {
    const raw = new URLSearchParams(location.search).get('palette');
    if (!raw) return;
    const colors = JSON.parse(decodeURIComponent(raw));
    if (!Array.isArray(colors) || !colors.length) return;
    // hex 형식 검증
    const hexRe = /^#[0-9a-fA-F]{6}$/;
    const valid = colors.filter(c => hexRe.test(c)).slice(0, 6);
    if (valid.length < 2) return;
    slots = valid.map(hex => ({ hex }));
    stripeRows = slots.map(() => 4);
  } catch {}
})();

// Initial renders
renderSlots();
redrawPreview();
updateContrast();
renderStripeCalcInputs();
initTabs();

// Simulator: texture buttons
document.querySelectorAll('.cp-texture-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cp-texture-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTexture = btn.dataset.texture;
    renderStripeSliders();
    redrawPreview();
  });
});

// Simulator: CVD mode
document.querySelectorAll('.cp-cvd-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cp-cvd-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    cvdMode = btn.dataset.cvd;
    redrawPreview();
  });
});

// Simulator: Add color button
document.getElementById('simAddColorBtn')?.addEventListener('click', () => {
  if (slots.length >= 6) return;
  // Pick a new color that's somewhat different from existing ones
  const hues = slots.map(s => hexToHsl(s.hex).h);
  const newHue = ((hues[hues.length - 1] || 0) + 60) % 360;
  const newHex = hslToHex(newHue, 60, 65);
  slots.push({ hex: newHex });
  stripeRows.push(4);
  renderSlots();
  redrawPreview();
  updateContrast();
  renderStripeSliders();
  updateAddBtn();
});

// Simulator: Save button
document.getElementById('simSaveBtn')?.addEventListener('click', async () => {
  const name = prompt(tr('cp_palette_name_prompt'), '내 팔레트');
  if (!name) return;
  await savePalette(slots.map(s => s.hex), name);
});

// Stripe calculator: color count change
document.getElementById('stripeCalcColorCount')?.addEventListener('change', () => {
  renderStripeCalcInputs();
  if (currentDist === 'custom') showCustomInputs();
});

// Stripe calculator: distribution buttons
document.querySelectorAll('[data-dist]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-dist]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentDist = btn.dataset.dist;
    if (currentDist === 'custom') showCustomInputs();
    else hideCustomInputs();
  });
});

// Stripe calculator: calculate button
document.getElementById('stripeCalcBtn')?.addEventListener('click', calculateStripes);

// Stripe calculator: send to simulator
document.getElementById('stripeToSimBtn')?.addEventListener('click', stripeToSim);

// Stripe calculator: save button
document.getElementById('stripeCalcSaveBtn')?.addEventListener('click', async () => {
  const colors = getStripeCalcColors();
  const name = prompt(tr('cp_palette_name_prompt'), tr('cp_tab_stripe'));
  if (!name) return;
  await savePalette(colors, name, 'stripes');
});


