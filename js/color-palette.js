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
  const lang = localStorage.getItem('ssuessue_lang') || 'ko';
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
    // Fair Isle: colors[0] = background, colors[1..] cycle as pattern colors
    const patSize = 16;
    const midCol = Math.floor(cols / 2);
    const midRow = Math.floor(rows / 2);
    const patColors = n > 1 ? colors.slice(1) : [colors[0]];

    for (let r = 0; r < rows; r++) {
      for (let l = 0; l < cols; l++) {
        const px = ((l - midCol + 8) % patSize + patSize) % patSize;
        const py = ((r - midRow + 8) % patSize + patSize) % patSize;
        const isPattern = NORDIC_PATTERN[py] && NORDIC_PATTERN[py][px] === 1;

        let curColor;
        if (!isPattern) {
          curColor = colors[0]; // background always color[0]
        } else {
          // Cycle through pattern colors per pattern repeat block
          const blockX = Math.floor(l / patSize);
          const blockY = Math.floor(r / patSize);
          const patIdx = (blockX + blockY) % patColors.length;
          curColor = patColors[patIdx];
        }
        drawStitch(ctx, l * cellW, r * cellH, cellW, cellH, curColor);
      }
    }
  } else if (texture === 'intarsia') {
    // Intarsia: divide canvas into equal vertical columns, one per color
    for (let r = 0; r < rows; r++) {
      for (let l = 0; l < cols; l++) {
        const colIdx = Math.floor((l / cols) * n);
        const c = colors[Math.min(colIdx, n - 1)];
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
  const patternRows = counts.reduce((a, b) => a + b, 0);
  if (patternRows === 0) return;

  const cellW = 12;
  const cellH = 10; // Fixed height per row — pattern repeats to fill canvas
  const cols = Math.ceil(W / cellW);

  let currentY = 0;
  // Keep repeating the stripe pattern until the canvas is filled
  while (currentY < H) {
    for (let i = 0; i < colors.length; i++) {
      const colorRows = counts[i];
      const c = colors[i];
      for (let r = 0; r < colorRows; r++) {
        if (currentY >= H) break;
        for (let l = 0; l < cols; l++) {
          drawStitch(ctx, l * cellW, currentY, cellW, cellH + 0.5, c);
        }
        currentY += cellH;
      }
      if (currentY >= H) break;
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

// ─── DRAG-AND-DROP SLOT REORDERING ───────────────────────────────────────────

let dragSrcIndex = null;

function makeTouchDraggable(handle, row, getIndex) {
  let longPressTimer = null;
  let ghostEl = null;
  let isDragging = false;
  let startX, startY;

  handle.addEventListener('touchstart', e => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;

    longPressTimer = setTimeout(() => {
      isDragging = true;
      dragSrcIndex = getIndex();

      ghostEl = row.cloneNode(true);
      ghostEl.style.cssText = `
        position: fixed; opacity: 0.85; pointer-events: none; z-index: 9999;
        width: ${row.offsetWidth}px; background: #fff;
        border: 2px dashed #000; box-shadow: 4px 4px 0 rgba(0,0,0,0.3);
      `;
      ghostEl.style.left = `${touch.clientX - row.offsetWidth / 2}px`;
      ghostEl.style.top  = `${touch.clientY - row.offsetHeight / 2}px`;
      document.body.appendChild(ghostEl);
      row.style.opacity = '0.4';
    }, 500); // 500ms long press
  }, { passive: true });

  handle.addEventListener('touchmove', e => {
    // Cancel long press if finger moved before 500ms
    if (!isDragging && longPressTimer) {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - startX);
      const dy = Math.abs(touch.clientY - startY);
      if (dx > 10 || dy > 10) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      return;
    }
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    if (ghostEl) {
      ghostEl.style.left = `${touch.clientX - ghostEl.offsetWidth / 2}px`;
      ghostEl.style.top  = `${touch.clientY - ghostEl.offsetHeight / 2}px`;
    }

    // Highlight drop target
    document.querySelectorAll('.cp-slot-row').forEach(r => r.classList.remove('cp-slot-drag-over'));
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    el?.closest('.cp-slot-row')?.classList.add('cp-slot-drag-over');
  }, { passive: false });

  const endTouch = e => {
    clearTimeout(longPressTimer);
    if (!isDragging) { isDragging = false; return; }
    isDragging = false;

    if (ghostEl) { ghostEl.remove(); ghostEl = null; }
    row.style.opacity = '';

    const touch = (e.changedTouches || e.touches)[0];
    if (!touch) return;

    document.querySelectorAll('.cp-slot-row').forEach(r => r.classList.remove('cp-slot-drag-over'));

    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.cp-slot-row');
    if (!targetEl) return;
    const rows = [...document.querySelectorAll('.cp-slot-row')];
    const targetIdx = rows.indexOf(targetEl);
    if (targetIdx === -1 || targetIdx === dragSrcIndex) return;

    reorderSlots(dragSrcIndex, targetIdx);
    dragSrcIndex = null;
  };

  handle.addEventListener('touchend', endTouch, { passive: true });
  handle.addEventListener('touchcancel', endTouch, { passive: true });
}

function reorderSlots(from, to) {
  if (from === to || from < 0 || to < 0) return;
  const [movedSlot] = slots.splice(from, 1);
  slots.splice(to, 0, movedSlot);
  const [movedRow] = stripeRows.splice(from, 1);
  stripeRows.splice(to, 0, movedRow);
  renderSlots();
  redrawPreview();
  updateContrast();
  renderStripeSliders();
}

function renderSlots() {
  const container = document.getElementById('simSlots');
  if (!container) return;
  container.innerHTML = '';

  slots.forEach((slot, i) => {
    const row = document.createElement('div');
    row.className = 'cp-slot-row';
    row.draggable = true;

    // Drag handle
    const handle = document.createElement('span');
    handle.className = 'cp-drag-handle';
    handle.textContent = '⠿';
    handle.title = 'Drag to reorder';

    // HTML5 DnD (desktop)
    row.addEventListener('dragstart', e => {
      dragSrcIndex = i;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => row.style.opacity = '0.4', 0);
    });
    row.addEventListener('dragend', () => {
      row.style.opacity = '';
      document.querySelectorAll('.cp-slot-row').forEach(r => r.classList.remove('cp-slot-drag-over'));
    });
    row.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.cp-slot-row').forEach(r => r.classList.remove('cp-slot-drag-over'));
      row.classList.add('cp-slot-drag-over');
    });
    row.addEventListener('dragleave', () => row.classList.remove('cp-slot-drag-over'));
    row.addEventListener('drop', e => {
      e.preventDefault();
      row.classList.remove('cp-slot-drag-over');
      if (dragSrcIndex !== null && dragSrcIndex !== i) {
        reorderSlots(dragSrcIndex, i);
        dragSrcIndex = null;
      }
    });

    // Touch DnD (mobile long press)
    makeTouchDraggable(handle, row, () => i);

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

    row.appendChild(handle);
    row.appendChild(colorInput);
    row.appendChild(hexInput);
    row.appendChild(removeBtn);
    container.appendChild(row);
  });

  updateAddBtn();
}


function updateAddBtn() {
  const btn = document.getElementById('simAddColorBtn');
  const notice = document.getElementById('fairisleNotice');
  const isFairisle = currentTexture === 'fairisle';
  const maxSlots = isFairisle ? 2 : 6;

  if (btn) btn.disabled = slots.length >= maxSlots;

  if (notice) {
    if (isFairisle && slots.length >= 2) {
      const lang = localStorage.getItem('lang') || 'ko';
      const msgs = {
        ko: '페어아일은 2가지 색상 사용을 권장합니다.',
        en: 'Fair Isle recommends using 2 colors.',
        ja: 'フェアアイルには2色を推奨します。'
      };
      notice.textContent = msgs[lang] || msgs.ko;
      notice.style.display = 'block';
    } else {
      notice.style.display = 'none';
    }
  }
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
    const paletteData = {
      name,
      colors,
      technique,
      season,
      mood,
      isPublic: false, // 기본적으로 비공개
      createdAt: serverTimestamp(),
    };
    await addDoc(collection(db, `users/${user.uid}/palettes`), paletteData);
    showToast(tr('cp_saved'));
  } catch (e) {
    console.error('savePalette error:', e);
    // 더 구체적인 에러 메시지 표시
    const errMsg = e.message ? `: ${e.message}` : '';
    showToast(tr('cp_save_error') + errMsg);
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

const textureDescs = {
  stockinette: { ko: '가장 기본이 되는 V자 코 모양입니다. 색상이 1단씩 번갈아가며 얇은 가로줄 배색을 만듭니다.', en: 'Basic V-shaped stitches. Colors alternate every 1 row creating thin stripes.', ja: '基本的なV字目です。色が1段ずつ交互になり、細いストライプ配色のようになります。' },
  garter: { ko: '가로로 올록볼록한 코 모양입니다. 색상이 1단씩 번갈아가며 입체감 있는 배색을 만듭니다.', en: 'Bumpy horizontal ridges. Colors alternate every 1 row.', ja: '横にでこぼこした形です。色が1段ずつ交互になり、立体感のある配色になります。' },
  stripes: { ko: '원하는 두께의 줄무늬를 직접 만들 수 있습니다. 아래 슬라이더에서 색상별 단수를 조절해 보세요!', en: 'Create custom stripes. Adjust the row thickness for each color using the sliders below!', ja: 'お好みの太さのストライプを作成できます。下の各色ごとの段数調整スライダーを動かしてみてください！' },
  fairisle: { ko: '가로로 실을 건너가며 뜨는 기법입니다. 눈꽃 무늬 같은 반복 요소가 자동으로 반영됩니다.', en: 'Stranded knitting technique. A repeating pattern is simulated automatically.', ja: '横に糸を渡して編む技法で、繰り返しの模様が自動的にシミュレーションされます。' },
  intarsia: { ko: '큰 색상 블록을 표현할 때 쓰는 기법입니다. 캔버스를 큼직한 구역으로 나누어 배색 느낌을 확인합니다.', en: 'Used for large color blocks. The canvas is divided into large solid areas.', ja: '大きな色ブロックを表現する技法で、キャンバスを大きなブロックに分けてシミュレーションします。' }
};

// Simulator: texture buttons
document.querySelectorAll('.cp-texture-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cp-texture-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTexture = btn.dataset.texture;
    
    // Update description text dynamically
    const descEl = document.getElementById('textureDesc');
    if (descEl) {
      const lang = localStorage.getItem('lang') || 'ko';
      descEl.textContent = textureDescs[currentTexture][lang] || textureDescs[currentTexture].ko;
    }
    
    renderStripeSliders();
    redrawPreview();
    updateAddBtn();
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
  // 현재 선택된 기법(currentTexture)도 함께 저장
  await savePalette(slots.map(s => s.hex), name, currentTexture);
});

