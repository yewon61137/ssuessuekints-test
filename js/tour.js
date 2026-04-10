// tour.js — 도안 생성기 온보딩 투어 (외부 라이브러리 없음, ko/en/ja 지원)
// 최초 방문 시 자동 실행, ? 버튼으로 언제든 재실행 가능

(function () {
  'use strict';

  const TOUR_KEY = 'tour_pattern_v1';
  const lang = (function () {
    try { return localStorage.getItem('ssuessue_lang') || 'ko'; } catch (e) { return 'ko'; }
  })();

  const STEPS = {
    ko: [
      { target: '.upload-section', title: '① 이미지 업로드', body: 'JPG 또는 PNG 파일을 선택하세요. 최대 10MB까지 지원합니다.', pos: 'bottom' },
      { target: '#previewArea',    title: '② 색상 미리보기 & 고정', body: '업로드 후 이미지를 확인하고, 도안에 꼭 넣고 싶은 색상을 클릭해 고정할 수 있어요.', pos: 'bottom' },
      { target: '#settingsArea',   title: '③ 세부 설정', body: '색상 수, 실 굵기, 도안 크기를 원하는 대로 조절하세요.', pos: 'bottom' },
      { target: '#generateBtn',    title: '④ 도안 생성', body: '설정이 끝나면 클릭! 몇 초 안에 나만의 뜨개 도안이 완성됩니다.', pos: 'top' },
      { target: '#editToolbar',    title: '⑤ 편집 도구', body: '연필로 색 바꾸기, 지우개로 삭제, 색상 피커로 팔레트 수정. 실수하면 Undo로 되돌려요.', pos: 'top', soft: true },
      { target: '#saveToCloudBtn', title: '⑥ 저장 & 다운로드', body: '완성된 도안을 클라우드에 저장하거나 PDF로 내보내세요.', pos: 'top', soft: true },
    ],
    en: [
      { target: '.upload-section', title: '① Upload Image', body: 'Select a JPG or PNG file (up to 10MB).', pos: 'bottom' },
      { target: '#previewArea',    title: '② Preview & Lock Colors', body: 'After uploading, click any color in the image to lock it into your pattern.', pos: 'bottom' },
      { target: '#settingsArea',   title: '③ Adjust Settings', body: 'Set color count, yarn weight, and pixel size to match your project.', pos: 'bottom' },
      { target: '#generateBtn',    title: '④ Generate Pattern', body: 'Hit this button when ready. Your pattern will be done in seconds!', pos: 'top' },
      { target: '#editToolbar',    title: '⑤ Editing Tools', body: 'Pencil to repaint, eraser to remove, color picker to swap palette colors. Undo is always available.', pos: 'top', soft: true },
      { target: '#saveToCloudBtn', title: '⑥ Save & Export', body: 'Save to the cloud or export as a PDF when done.', pos: 'top', soft: true },
    ],
    ja: [
      { target: '.upload-section', title: '① 画像のアップロード', body: 'JPGまたはPNGファイルを選択してください（最大10MB）。', pos: 'bottom' },
      { target: '#previewArea',    title: '② プレビューと色の固定', body: 'アップロード後、図案に必ず使いたい色を画像上でクリックして固定できます。', pos: 'bottom' },
      { target: '#settingsArea',   title: '③ 詳細設定', body: '色数・毛糸の太さ・ピクセルサイズをお好みに合わせて調整してください。', pos: 'bottom' },
      { target: '#generateBtn',    title: '④ 図案を生成', body: '準備ができたらクリック！数秒でオリジナル図案が完成します。', pos: 'top' },
      { target: '#editToolbar',    title: '⑤ 編集ツール', body: '鉛筆で色変更、消しゴムで削除、カラーピッカーでパレット編集。ミスはUndoで戻せます。', pos: 'top', soft: true },
      { target: '#saveToCloudBtn', title: '⑥ 保存とエクスポート', body: '完成した図案をクラウドに保存するか、PDFでエクスポートしてください。', pos: 'top', soft: true },
    ],
  };

  const UI = {
    ko: { prev: '이전', next: '다음', done: '완료', skip: '건너뛰기', help: '이용 가이드' },
    en: { prev: 'Prev', next: 'Next', done: 'Done', skip: 'Skip', help: 'Usage Guide' },
    ja: { prev: '前へ', next: '次へ', done: '完了', skip: 'スキップ', help: 'ガイド' },
  };

  const steps = STEPS[lang] || STEPS.ko;
  const ui = UI[lang] || UI.ko;
  let current = 0;
  let overlayEl, highlightEl, tooltipEl;

  // ── CSS 주입 ────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('tour-styles')) return;
    const s = document.createElement('style');
    s.id = 'tour-styles';
    s.textContent = `
      #tourOverlay {
        position: fixed; inset: 0; z-index: 9990;
        background: transparent; pointer-events: all; cursor: default;
      }
      #tourHighlight {
        position: fixed; z-index: 9991; border-radius: 8px;
        pointer-events: none;
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
        border: 2px solid rgba(255, 255, 255, 0.85);
        transition: top 0.2s ease, left 0.2s ease, width 0.2s ease, height 0.2s ease;
      }
      #tourTooltip {
        position: fixed; z-index: 9992;
        background: #fff; border-radius: 14px;
        padding: 1.25rem 1.5rem;
        max-width: 320px; width: calc(100vw - 2rem);
        box-shadow: 0 8px 40px rgba(0, 0, 0, 0.22);
        pointer-events: all; font-family: inherit;
        transition: top 0.2s ease, left 0.2s ease;
      }
      #tourTooltip .t-count { font-size: 0.72rem; color: #aaa; margin-bottom: 0.3rem; }
      #tourTooltip .t-title { font-size: 1rem; font-weight: 800; margin: 0 0 0.5rem; color: #1a1a1a; }
      #tourTooltip .t-body  { font-size: 0.875rem; line-height: 1.65; color: #444; margin: 0 0 1rem; }
      #tourTooltip .t-nav   { display: flex; gap: 0.5rem; align-items: center; }
      #tourTooltip .t-skip  { margin-right: auto; font-size: 0.78rem; color: #bbb; background: none; border: none; cursor: pointer; padding: 0; }
      #tourTooltip .t-skip:hover { color: #888; }
      #tourTooltip .t-btn   { padding: 0.45rem 1.1rem; border-radius: 8px; font-size: 0.85rem; font-weight: 700; cursor: pointer; border: none; font-family: inherit; }
      #tourTooltip .t-btn-ghost   { background: #f0f0f0; color: #333; }
      #tourTooltip .t-btn-ghost:hover { background: #e2e2e2; }
      #tourTooltip .t-btn-primary { background: var(--primary-color, #2d6a4f); color: #fff; }
      #tourTooltip .t-btn-primary:hover { opacity: 0.88; }
      #tourHelpBtn {
        position: fixed; bottom: 5.5rem; right: 1.25rem; z-index: 998;
        width: 2.25rem; height: 2.25rem; border-radius: 50%;
        background: var(--primary-color, #2d6a4f); color: #fff;
        border: none; font-size: 1.05rem; font-weight: 800; cursor: pointer;
        box-shadow: 0 2px 10px rgba(0,0,0,0.18);
        display: flex; align-items: center; justify-content: center;
        transition: opacity 0.2s;
      }
      #tourHelpBtn:hover { opacity: 0.82; }
    `;
    document.head.appendChild(s);
  }

  // ── 타깃 요소가 실제로 보이는지 확인 ─────────────────────────────────────
  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  // ── 툴팁 위치 계산 ────────────────────────────────────────────────────────
  function position(rect, pos) {
    const pad = 14;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tipW = Math.min(320, vw - 32);
    const tipH = tooltipEl.offsetHeight || 180;

    let top, left;

    if (!rect) {
      top  = Math.max(pad, (vh - tipH) / 2);
      left = Math.max(pad, (vw - tipW) / 2);
    } else if (pos === 'bottom') {
      top  = Math.min(rect.bottom + pad, vh - tipH - pad);
      left = Math.max(pad, Math.min(rect.left, vw - tipW - pad));
    } else {
      top  = Math.max(pad, rect.top - tipH - pad);
      left = Math.max(pad, Math.min(rect.left, vw - tipW - pad));
    }

    tooltipEl.style.top  = top  + 'px';
    tooltipEl.style.left = left + 'px';
    tooltipEl.style.width = tipW + 'px';
  }

  // ── 하이라이트 위치 ───────────────────────────────────────────────────────
  function placeHighlight(rect) {
    if (!rect) {
      highlightEl.style.opacity = '0';
      return;
    }
    const p = 7;
    highlightEl.style.opacity = '1';
    highlightEl.style.top    = (rect.top    - p) + 'px';
    highlightEl.style.left   = (rect.left   - p) + 'px';
    highlightEl.style.width  = (rect.width  + p * 2) + 'px';
    highlightEl.style.height = (rect.height + p * 2) + 'px';
  }

  // ── 스텝 렌더 ─────────────────────────────────────────────────────────────
  function showStep(idx) {
    current = idx;
    const step = steps[idx];
    const el   = document.querySelector(step.target);
    const vis  = isVisible(el);

    // 스크롤 후 위치 계산
    if (vis && el) {
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
    }

    const rect = (vis && el) ? el.getBoundingClientRect() : null;
    placeHighlight(rect);

    // 콘텐츠 렌더
    tooltipEl.innerHTML = `
      <div class="t-count">${idx + 1} / ${steps.length}</div>
      <p class="t-title">${step.title}</p>
      <p class="t-body">${step.body}</p>
      <div class="t-nav">
        <button class="t-skip">${ui.skip}</button>
        ${idx > 0 ? `<button class="t-btn t-btn-ghost" id="tourPrev">${ui.prev}</button>` : ''}
        <button class="t-btn t-btn-primary" id="tourNext">${idx < steps.length - 1 ? ui.next : ui.done}</button>
      </div>
    `;

    // 위치 지정 (렌더 완료 후 높이 읽기 위해 rAF)
    requestAnimationFrame(() => {
      const fresh = (vis && el) ? el.getBoundingClientRect() : null;
      position(fresh, step.pos);
    });

    tooltipEl.querySelector('.t-skip').addEventListener('click', closeTour);
    tooltipEl.querySelector('#tourPrev')?.addEventListener('click', () => showStep(idx - 1));
    tooltipEl.querySelector('#tourNext')?.addEventListener('click', () => {
      if (idx < steps.length - 1) showStep(idx + 1);
      else closeTour();
    });
  }

  // ── 투어 시작 ─────────────────────────────────────────────────────────────
  function startTour() {
    if (document.getElementById('tourHighlight')) return;

    overlayEl = document.createElement('div');
    overlayEl.id = 'tourOverlay';
    overlayEl.addEventListener('click', closeTour);
    document.body.appendChild(overlayEl);

    highlightEl = document.createElement('div');
    highlightEl.id = 'tourHighlight';
    document.body.appendChild(highlightEl);

    tooltipEl = document.createElement('div');
    tooltipEl.id = 'tourTooltip';
    document.body.appendChild(tooltipEl);

    document.addEventListener('keydown', onKey);
    showStep(0);
  }

  // ── 투어 종료 ─────────────────────────────────────────────────────────────
  function closeTour() {
    overlayEl?.remove();
    highlightEl?.remove();
    tooltipEl?.remove();
    overlayEl = highlightEl = tooltipEl = null;
    document.removeEventListener('keydown', onKey);
    try { localStorage.setItem(TOUR_KEY, '1'); } catch (e) {}
  }

  function onKey(e) {
    if (e.key === 'Escape') { closeTour(); }
    else if (e.key === 'ArrowRight' && current < steps.length - 1) { showStep(current + 1); }
    else if (e.key === 'ArrowLeft'  && current > 0) { showStep(current - 1); }
  }

  // ── ? 버튼 ───────────────────────────────────────────────────────────────
  function addHelpButton() {
    if (document.getElementById('tourHelpBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'tourHelpBtn';
    btn.setAttribute('aria-label', ui.help);
    btn.title = ui.help;
    btn.textContent = '?';
    btn.addEventListener('click', startTour);
    document.body.appendChild(btn);
  }

  // ── 초기화 ───────────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    addHelpButton();
    let seen = false;
    try { seen = !!localStorage.getItem(TOUR_KEY); } catch (e) {}
    if (!seen) setTimeout(startTour, 900);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
