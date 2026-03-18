import { auth, db, initAuth, openAuthModal } from './auth.js?v=6';
import { initLang } from './i18n.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  collection, addDoc, getDocs, doc, deleteDoc, updateDoc,
  query, orderBy, limit, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// ─── i18n ────────────────────────────────────────────────────────────────────

const pageT = {
  cp_tab_simulator: { ko: '색상 시뮬레이터', en: 'Color Simulator', ja: 'カラーシミュレーター' },
  cp_tab_recommend: { ko: '팔레트 추천', en: 'Palette Recommendation', ja: 'パレット推薦' },
  cp_tab_stripe:    { ko: '줄무늬 계산기', en: 'Stripe Calculator', ja: 'ストライプ計算機' },
  cp_tab_curation:  { ko: '큐레이션', en: 'Curation', ja: 'キュレーション' },

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

function renderTexture(canvas, colors, texture, stripeRows) {
  if (!canvas || !colors || colors.length === 0) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const n = colors.length;
  const colorAt = i => colors[((i % n) + n) % n];

  if (texture === 'stockinette') {
    const cellW = 10, cellH = 8;
    const cols = Math.ceil(W / cellW);
    const rows = Math.ceil(H / cellH);
    for (let row = 0; row < rows; row++) {
      const bg = colorAt(row);
      const darker = shadeHex(bg, -30);
      for (let col = 0; col < cols; col++) {
        const x = col * cellW;
        const y = row * cellH;
        ctx.fillStyle = bg;
        ctx.fillRect(x, y, cellW, cellH);
        // V shape stitch
        ctx.strokeStyle = darker;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const cx = x + cellW / 2;
        const top = y + 1;
        const mid = y + cellH - 2;
        ctx.moveTo(x + 2, top);
        ctx.lineTo(cx, mid);
        ctx.lineTo(x + cellW - 2, top);
        ctx.stroke();
      }
    }
  } else if (texture === 'garter') {
    const ridgeH = 8;
    const rows = Math.ceil(H / ridgeH);
    for (let row = 0; row < rows; row++) {
      const base = colorAt(row);
      const lighter = shadeHex(base, 25);
      const darker  = shadeHex(base, -25);
      const y = row * ridgeH;
      // Main fill
      ctx.fillStyle = base;
      ctx.fillRect(0, y, W, ridgeH);
      // Top highlight
      ctx.fillStyle = lighter;
      ctx.fillRect(0, y, W, 2);
      // Bottom shadow
      ctx.fillStyle = darker;
      ctx.fillRect(0, y + ridgeH - 2, W, 2);
    }
  } else if (texture === 'stripes') {
    renderStripePreview(canvas, colors, stripeRows);
  } else if (texture === 'fairisle') {
    const pattern = [
      [0,0,1,0,0,0,1,0],
      [0,1,1,1,0,1,1,1],
      [1,1,0,1,1,1,0,1],
      [0,1,1,1,0,1,1,1],
      [0,0,1,0,0,0,1,0],
      [1,1,0,1,1,1,0,1],
      [0,1,1,1,0,1,1,1],
      [1,0,0,0,1,0,0,0],
    ];
    const tileSize = 8;
    const tilesX = Math.ceil(W / tileSize);
    const tilesY = Math.ceil(H / tileSize);
    // pattern color cycles through colors[1..n-1]
    let patColorIdx = 0;
    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        for (let py = 0; py < tileSize; py++) {
          for (let px = 0; px < tileSize; px++) {
            const cell = pattern[py][px];
            let c;
            if (cell === 0) {
              c = colors[0];
            } else {
              // cycle through colors[1..] per pattern row
              const patIdx = n > 1 ? 1 + (py % (n - 1)) : 0;
              c = colors[patIdx];
            }
            ctx.fillStyle = c;
            ctx.fillRect(tx * tileSize + px, ty * tileSize + py, 1, 1);
          }
        }
      }
    }
  } else if (texture === 'intarsia') {
    if (n === 1) {
      ctx.fillStyle = colors[0];
      ctx.fillRect(0, 0, W, H);
    } else if (n === 2) {
      ctx.fillStyle = colors[0];
      ctx.fillRect(0, 0, W / 2, H);
      ctx.fillStyle = colors[1];
      ctx.fillRect(W / 2, 0, W / 2, H);
    } else if (n === 3) {
      const w3 = W / 3;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = colors[i];
        ctx.fillRect(i * w3, 0, w3, H);
      }
    } else {
      // 2x2 grid (or more)
      const cols2 = 2;
      const rows2 = Math.ceil(n / 2);
      const bw = W / cols2;
      const bh = H / rows2;
      for (let i = 0; i < n; i++) {
        const col2 = i % cols2;
        const row2 = Math.floor(i / cols2);
        ctx.fillStyle = colors[i];
        ctx.fillRect(col2 * bw, row2 * bh, bw, bh);
      }
    }
    // Border between blocks
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    if (n === 2) {
      ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
    } else if (n === 3) {
      for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(i*W/3, 0); ctx.lineTo(i*W/3, H); ctx.stroke();
      }
    } else if (n >= 4) {
      ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
      const rows2 = Math.ceil(n / 2);
      for (let r = 1; r < rows2; r++) {
        const y = r * (H / rows2);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
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

  let y = 0;
  for (let i = 0; i < colors.length; i++) {
    const blockH = (counts[i] / totalRows) * H;
    ctx.fillStyle = colors[i];
    ctx.fillRect(0, Math.round(y), W, Math.round(blockH));
    y += blockH;
  }
}

// ─── STATE ───────────────────────────────────────────────────────────────────

let slots = [{ hex: '#D4A8C8' }, { hex: '#7EC8C8' }];
let currentTexture = 'stockinette';
let stripeRows = [4, 4];
let cvdMode = 'normal';
let currentDist = 'equal';
let stripeCalcResult = null;

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
  const ratio = contrastRatio(slots[0].hex, slots[1].hex);
  let msg, cls;
  if (ratio >= 7) {
    msg = tr('cp_contrast_good');
    cls = 'cp-contrast cp-contrast-good';
  } else if (ratio >= 4.5) {
    msg = tr('cp_contrast_ok');
    cls = 'cp-contrast cp-contrast-ok';
  } else if (ratio >= 3) {
    msg = `AA Large — ${tr('cp_contrast_ok').split('—')[1] || '대비가 약간 부족해요'}`;
    cls = 'cp-contrast cp-contrast-warning';
  } else {
    msg = tr('cp_contrast_poor');
    cls = 'cp-contrast cp-contrast-poor';
  }
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

// ─── PALETTE RECOMMENDATION (TAB 2) ──────────────────────────────────────────

function clampHsl(h, s, l) {
  return {
    h: ((h % 360) + 360) % 360,
    s: Math.max(0, Math.min(100, s)),
    l: Math.max(0, Math.min(100, l)),
  };
}

function generatePalettes() {
  const baseInput = document.getElementById('recBaseColor');
  const techEl   = document.getElementById('recTechnique');
  const container = document.getElementById('recResults');
  if (!baseInput || !container) return;

  const baseHex = baseInput.value;
  const season  = document.querySelector('#recSeasonFilter .cp-filter-btn.active')?.dataset.val || 'all';
  const mood    = document.querySelector('#recMoodFilter .cp-filter-btn.active')?.dataset.val || 'all';
  const tech    = techEl ? techEl.value : 'default';
  const { h, s, l } = hexToHsl(baseHex);

  // Determine color count range based on technique
  let minColors = 2, maxColors = 4;
  if (tech === 'stripes')    { minColors = 2; maxColors = 5; }
  else if (tech === 'fairisle')  { minColors = 2; maxColors = 4; }
  else if (tech === 'intarsia')  { minColors = 2; maxColors = 6; }

  // Generate base harmony sets
  const harmonySchemes = [
    { name_ko: '유사색 #1',  name_en: 'Analogous #1',  name_ja: '類似色 #1',  hues: [h, h+15, h+30] },
    { name_ko: '유사색 #2',  name_en: 'Analogous #2',  name_ja: '類似色 #2',  hues: [h, h-15, h-30] },
    { name_ko: '보색',       name_en: 'Complementary', name_ja: '補色',       hues: [h, h+180] },
    { name_ko: '분보색 #1',  name_en: 'Split Comp #1', name_ja: '分補色 #1', hues: [h, h+150, h+210] },
    { name_ko: '분보색 #2',  name_en: 'Split Comp #2', name_ja: '分補色 #2', hues: [h, h-150, h-210] },
    { name_ko: '삼색배색',   name_en: 'Triadic',       name_ja: '三色配色',   hues: [h, h+120, h+240] },
    { name_ko: '사각배색',   name_en: 'Tetradic',      name_ja: '四角配色',  hues: [h, h+90, h+180, h+270] },
    { name_ko: '유사색 #3',  name_en: 'Analogous #3',  name_ja: '類似色 #3',  hues: [h, h+20, h+40, h+60] },
    { name_ko: '보완색',     name_en: 'Complement+',   name_ja: '補完色',    hues: [h, h+30, h+180, h+210] },
    { name_ko: '모노크롬 #1',name_en: 'Monochrome #1', name_ja: 'モノクロ #1', hues: [h, h, h, h] },
    { name_ko: '모노크롬 #2',name_en: 'Monochrome #2', name_ja: 'モノクロ #2', hues: [h, h, h] },
    { name_ko: '오각배색',   name_en: 'Pentadic',      name_ja: '五角配色',  hues: [h, h+72, h+144, h+216, h+288] },
  ];

  // Season/mood adjustments
  const applyMoodToColor = (hue, idx, total) => {
    let ns = s, nl = l;
    if (season === 'spring') { ns = Math.max(40, Math.min(70, s + (idx%2===0?5:-5))); nl = Math.max(55, Math.min(80, l + (idx%2===0?10:-5))); }
    else if (season === 'summer') { ns = Math.max(50, Math.min(80, s)); nl = Math.max(45, Math.min(75, l)); }
    else if (season === 'autumn') { ns = Math.max(50, Math.min(80, s)); nl = Math.max(30, Math.min(60, l)); }
    else if (season === 'winter') {
      ns = Math.max(30, Math.min(60, s));
      nl = idx % 2 === 0 ? Math.max(80, Math.min(95, l + 30)) : Math.max(20, Math.min(50, l - 20));
    }
    if (mood === 'warm') { ns = Math.max(50, Math.min(80, s)); nl = Math.max(45, Math.min(75, l)); }
    else if (mood === 'cool') { ns = Math.max(40, Math.min(70, s)); nl = Math.max(40, Math.min(70, l)); }
    else if (mood === 'pastel') { ns = Math.max(30, Math.min(50, s)); nl = Math.max(70, Math.min(85, l)); }
    else if (mood === 'vintage') { ns = Math.max(30, Math.min(55, s)); nl = Math.max(40, Math.min(65, l)); }
    else if (mood === 'natural') { ns = Math.max(20, Math.min(50, s)); nl = Math.max(50, Math.min(75, l)); }
    else if (mood === 'modern') {
      if (idx === 0) { ns = 0; nl = 10; }
      else if (idx === total - 1) { ns = 0; nl = 95; }
    }
    return clampHsl(hue, ns, nl);
  };

  container.innerHTML = '';
  const lang = localStorage.getItem('ssuessue_lang') || 'ko';

  harmonySchemes.forEach((scheme, si) => {
    let colorCount = Math.min(maxColors, Math.max(minColors, scheme.hues.length));
    if (scheme.name_en.startsWith('Monochrome')) {
      colorCount = scheme.name_en.includes('#2') ? 3 : 4;
    }

    const colors = scheme.hues.slice(0, colorCount).map((hue, idx) => {
      if (scheme.name_en.startsWith('Monochrome')) {
        // vary lightness
        const lightnesses = [l - 25, l, l + 25, l + 45];
        const c = clampHsl(hue, s * 0.7, lightnesses[idx] || l);
        return hslToHex(c.h, c.s, c.l);
      }
      const c = applyMoodToColor(hue, idx, colorCount);
      return hslToHex(c.h, c.s, c.l);
    });

    const name = scheme[`name_${lang}`] || scheme.name_ko;
    const techLabel = tech !== 'default' ? tr(`cp_tex_${tech === 'stockinette' ? 'stk' : tech === 'garter' ? 'gtr' : tech === 'stripes' ? 'str' : tech === 'fairisle' ? 'fi' : 'int'}`) : '';

    const card = document.createElement('div');
    card.className = 'cp-palette-card';

    const swatches = document.createElement('div');
    swatches.className = 'cp-palette-swatches';
    colors.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'cp-palette-swatch';
      sw.style.background = c;
      sw.title = c;
      swatches.appendChild(sw);
    });

    const nameEl = document.createElement('div');
    nameEl.className = 'cp-palette-name';
    nameEl.textContent = name;

    const tags = document.createElement('div');
    tags.className = 'cp-palette-tags';
    if (season && season !== 'all') {
      const t = document.createElement('span');
      t.className = 'post-card-tag';
      t.textContent = tr(`cp_${season}`);
      tags.appendChild(t);
    }
    if (mood && mood !== 'all') {
      const t = document.createElement('span');
      t.className = 'post-card-tag';
      t.textContent = tr(`cp_${mood}`);
      tags.appendChild(t);
    }
    if (techLabel) {
      const t = document.createElement('span');
      t.className = 'post-card-tag';
      t.textContent = techLabel;
      tags.appendChild(t);
    }

    const actions = document.createElement('div');
    actions.className = 'cp-palette-actions';

    const simBtn = document.createElement('button');
    simBtn.className = 'secondary-btn small-btn cp-to-sim-btn';
    simBtn.textContent = tr('cp_view_sim');
    simBtn.addEventListener('click', () => sendToSimulator(colors));

    const saveBtn = document.createElement('button');
    saveBtn.className = 'secondary-btn small-btn cp-save-btn-card';
    saveBtn.textContent = tr('cp_save_palette');
    saveBtn.addEventListener('click', async () => {
      const palName = prompt(tr('cp_palette_name_prompt'), name);
      if (!palName) return;
      await savePalette(colors, palName, tech !== 'default' ? tech : '', season !== 'all' ? season : '', mood !== 'all' ? mood : '');
    });

    actions.appendChild(simBtn);
    actions.appendChild(saveBtn);
    card.appendChild(swatches);
    card.appendChild(nameEl);
    card.appendChild(tags);
    card.appendChild(actions);
    container.appendChild(card);
  });
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
  const colors = getStripeCalcColors();
  container.innerHTML = '';
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
    numIn.value = 4;
    numIn.className = 'cp-custom-rows-input';
    numIn.dataset.idx = i;
    const unitSpan = document.createElement('span');
    unitSpan.textContent = ' 단';
    row.appendChild(swatch);
    row.appendChild(label);
    row.appendChild(numIn);
    row.appendChild(unitSpan);
    container.appendChild(row);
  });
}

function hideCustomInputs() {
  const container = document.getElementById('stripeCustomInputs');
  if (container) container.style.display = 'none';
}

function distributeRows(n, totalRows, dist) {
  if (dist === 'equal') {
    const base = Math.floor(totalRows / n);
    const result = Array(n).fill(base);
    result[n - 1] += totalRows - base * n;
    return result;
  }
  if (dist === 'golden') {
    const ratios = Array.from({ length: n }, (_, i) => Math.pow(1.618, i));
    const sum = ratios.reduce((a, b) => a + b, 0);
    const rows = ratios.map(r => Math.max(1, Math.round((r / sum) * totalRows)));
    // Fix rounding
    const diff = totalRows - rows.reduce((a, b) => a + b, 0);
    rows[rows.length - 1] += diff;
    return rows;
  }
  if (dist === 'fibonacci') {
    const fibs = [1,1,2,3,5,8,13,21,34,55,89];
    const seq = Array.from({ length: n }, (_, i) => fibs[i % fibs.length]);
    const sum = seq.reduce((a, b) => a + b, 0);
    const rows = seq.map(r => Math.max(1, Math.round((r / sum) * totalRows)));
    const diff = totalRows - rows.reduce((a, b) => a + b, 0);
    rows[rows.length - 1] += diff;
    return rows;
  }
  if (dist === 'custom') {
    const inputs = document.querySelectorAll('.cp-custom-rows-input');
    return Array.from(inputs).map(inp => Math.max(1, parseInt(inp.value) || 4));
  }
  return Array(n).fill(Math.floor(totalRows / n));
}

function calculateStripes() {
  const totalRowsEl = document.getElementById('stripeCalcTotalRows');
  const container   = document.getElementById('stripeCalcResult');
  const previewCanvas = document.getElementById('stripeCalcCanvas');
  if (!totalRowsEl || !container) return;

  const totalRows = parseInt(totalRowsEl.value) || 20;
  const colors = getStripeCalcColors();
  const n = colors.length;
  const rowDist = distributeRows(n, totalRows, currentDist);

  stripeCalcResult = { colors, rowDist };

  // Render table
  container.style.display = '';
  const table = document.createElement('table');
  table.className = 'cp-stripe-table';
  const thead = document.createElement('thead');
  const hrow = document.createElement('tr');
  [tr('cp_color'), tr('cp_rows'), tr('cp_ratio')].forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    hrow.appendChild(th);
  });
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const effectiveTotal = rowDist.reduce((a, b) => a + b, 0);
  colors.forEach((c, i) => {
    const tr2 = document.createElement('tr');

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

    tr2.appendChild(tdColor);
    tr2.appendChild(tdRows);
    tr2.appendChild(tdRatio);
    tbody.appendChild(tr2);
  });
  table.appendChild(tbody);

  container.innerHTML = '';
  container.appendChild(table);

  // Render preview
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

// ─── CURATION (TAB 4) ────────────────────────────────────────────────────────

const CURATED_PALETTES = [
  { id: 'spring-floral',   name: { ko: '봄 플로럴',      en: 'Spring Floral',   ja: '春フローラル'         }, colors: ['#F4B8C0','#B2DFCD','#D4C1E8','#FFF5E0'], tags: ['spring','pastel'],   technique: { ko: '페어아일',  en: 'Fair Isle',   ja: 'フェアアイル'    } },
  { id: 'summer-beach',    name: { ko: '여름 비치',       en: 'Summer Beach',    ja: '夏ビーチ'              }, colors: ['#E8734A','#1A3A5C','#F7F5F0','#F5C842'], tags: ['summer','warm'],    technique: { ko: '줄무늬',    en: 'Stripes',     ja: '縞模様'          } },
  { id: 'autumn-harvest',  name: { ko: '가을 하베스트',   en: 'Autumn Harvest',  ja: '秋ハーベスト'          }, colors: ['#D4A017','#C05A3E','#6B3A2A','#E8D5B0'], tags: ['autumn','vintage'], technique: { ko: '인타샤',    en: 'Intarsia',    ja: 'インタルシア'    } },
  { id: 'winter-frost',    name: { ko: '겨울 프로스트',   en: 'Winter Frost',    ja: '冬フロスト'            }, colors: ['#F5F5F0','#8C9BAB','#1E3A4A','#8B1A2F'], tags: ['winter','cool'],    technique: { ko: '배색뜨기',  en: 'Colorwork',   ja: '配色編み'        } },
  { id: 'vintage-garden',  name: { ko: '빈티지 가든',     en: 'Vintage Garden',  ja: 'ヴィンテージガーデン'  }, colors: ['#C4899A','#8BA888','#F2EBD9','#C05A3E'], tags: ['vintage','natural'],technique: { ko: '페어아일',  en: 'Fair Isle',   ja: 'フェアアイル'    } },
  { id: 'modern-mono',     name: { ko: '모던 모노',       en: 'Modern Mono',     ja: 'モダンモノ'            }, colors: ['#1A1A1A','#F5F5F5','#808080','#E8734A'], tags: ['modern'],           technique: { ko: '인타샤',    en: 'Intarsia',    ja: 'インタルシア'    } },
  { id: 'pastel-dream',    name: { ko: '파스텔 드림',     en: 'Pastel Dream',    ja: 'パステルドリーム'      }, colors: ['#FFD1DC','#AEE1E1','#D4B8E0','#FFFACD'], tags: ['pastel','spring'],  technique: { ko: '줄무늬',    en: 'Stripes',     ja: '縞模様'          } },
  { id: 'natural-earth',   name: { ko: '내추럴 어스',     en: 'Natural Earth',   ja: 'ナチュラルアース'      }, colors: ['#EDE0D4','#C4A882','#8B6940','#F5F0E8'], tags: ['natural','autumn'], technique: { ko: '메리야스',  en: 'Stockinette', ja: 'メリヤス'        } },
  { id: 'spring-meadow',   name: { ko: '봄 초원',         en: 'Spring Meadow',   ja: '春の草原'              }, colors: ['#A8D8A8','#FFE8B5','#FFB3C6','#B5EAD7'], tags: ['spring','warm'],   technique: { ko: '줄무늬',    en: 'Stripes',     ja: '縞模様'          } },
  { id: 'summer-sunset',   name: { ko: '여름 선셋',       en: 'Summer Sunset',   ja: '夏サンセット'          }, colors: ['#FF6B6B','#FFD93D','#FF8C42','#F5F5F5'], tags: ['summer','warm'],   technique: { ko: '페어아일',  en: 'Fair Isle',   ja: 'フェアアイル'    } },
  { id: 'autumn-forest',   name: { ko: '가을 숲',         en: 'Autumn Forest',   ja: '秋の森'                }, colors: ['#4A5240','#8B7355','#D4A574','#2C3E1A'], tags: ['autumn','natural'], technique: { ko: '인타샤',   en: 'Intarsia',    ja: 'インタルシア'    } },
  { id: 'winter-cozy',     name: { ko: '겨울 코지',       en: 'Winter Cozy',     ja: '冬コージー'            }, colors: ['#F0E6D3','#8B4513','#2F4F4F','#DC143C'], tags: ['winter','vintage'], technique: { ko: '배색뜨기',  en: 'Colorwork',   ja: '配色編み'        } },
];

function renderCuration(filter) {
  const container = document.getElementById('curGrid');
  if (!container) return;
  const lang = localStorage.getItem('ssuessue_lang') || 'ko';

  const filtered = filter === 'all'
    ? CURATED_PALETTES
    : CURATED_PALETTES.filter(p => p.tags.includes(filter));

  container.innerHTML = '';
  filtered.forEach(palette => {
    const card = document.createElement('div');
    card.className = 'cp-palette-card';

    const swatches = document.createElement('div');
    swatches.className = 'cp-palette-swatches';
    palette.colors.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'cp-palette-swatch';
      sw.style.background = c;
      sw.title = c;
      swatches.appendChild(sw);
    });

    const nameEl = document.createElement('div');
    nameEl.className = 'cp-palette-name';
    nameEl.textContent = palette.name[lang] || palette.name.ko;

    const tags = document.createElement('div');
    tags.className = 'cp-palette-tags';
    palette.tags.forEach(tag => {
      const t = document.createElement('span');
      t.className = 'post-card-tag';
      const keyMap = { spring:'cp_spring', summer:'cp_summer', autumn:'cp_autumn', winter:'cp_winter', warm:'cp_warm', cool:'cp_cool', vintage:'cp_vintage', modern:'cp_modern', pastel:'cp_pastel', natural:'cp_natural' };
      t.textContent = keyMap[tag] ? tr(keyMap[tag]) : tag;
      tags.appendChild(t);
    });
    const techTag = document.createElement('span');
    techTag.className = 'post-card-tag';
    techTag.textContent = palette.technique[lang] || palette.technique.ko;
    tags.appendChild(techTag);

    const actions = document.createElement('div');
    actions.className = 'cp-palette-actions';

    const simBtn = document.createElement('button');
    simBtn.className = 'secondary-btn small-btn cp-to-sim-btn';
    simBtn.textContent = tr('cp_view_sim');
    simBtn.addEventListener('click', () => sendToSimulator(palette.colors));

    const saveBtn = document.createElement('button');
    saveBtn.className = 'secondary-btn small-btn cp-save-btn-card';
    saveBtn.textContent = tr('cp_save_palette');
    saveBtn.addEventListener('click', async () => {
      const palName = prompt(tr('cp_palette_name_prompt'), palette.name[lang] || palette.name.ko);
      if (!palName) return;
      await savePalette(palette.colors, palName, '', palette.tags[0] || '', palette.tags[1] || '');
    });

    actions.appendChild(simBtn);
    actions.appendChild(saveBtn);
    card.appendChild(swatches);
    card.appendChild(nameEl);
    card.appendChild(tags);
    card.appendChild(actions);
    container.appendChild(card);
  });
}

// ─── PALETTE SAVE ─────────────────────────────────────────────────────────────

async function savePalette(colors, name, technique = '', season = '', mood = '') {
  const user = auth.currentUser;
  if (!user) {
    openAuthModal();
    showToast(tr('cp_login_to_save'));
    return;
  }
  try {
    if (user) {
      await addDoc(collection(db, `users/${user.uid}/palettes`), {
        name,
        colors,
        technique,
        season,
        mood,
        createdAt: serverTimestamp(),
      });
      showToast(tr('cp_saved'));
    } else {
      // (unreachable — guarded above, kept for safety)
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
      setTimeout(() => showToast(tr('cp_login_to_save'), true), 2000);
    }
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
renderCuration('all');
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

// Recommendation: Generate button
document.getElementById('recGenerateBtn')?.addEventListener('click', generatePalettes);

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

// Curation: filter buttons
document.querySelectorAll('#curFilter .cp-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#curFilter .cp-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderCuration(btn.dataset.filter);
  });
});

// 조합 추천 — 시즌/무드 필터 버튼 토글
['recSeasonFilter', 'recMoodFilter'].forEach(containerId => {
  document.querySelectorAll(`#${containerId} .cp-filter-btn`).forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll(`#${containerId} .cp-filter-btn`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
});

// 조합 추천 — 기준색 헥스 입력 동기화
(function initRecBaseColor() {
  const colorInput = document.getElementById('recBaseColor');
  const hexInput   = document.getElementById('recBaseHex');
  if (!colorInput || !hexInput) return;
  colorInput.addEventListener('input', () => { hexInput.value = colorInput.value; });
  hexInput.addEventListener('input', () => {
    if (/^#[0-9a-fA-F]{6}$/.test(hexInput.value)) colorInput.value = hexInput.value;
  });
})();
