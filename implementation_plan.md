# Implementation Plan — 모바일/태블릿 버그 수정

작성일: 2026-04-28  
대상 브랜치: main

---

## Phase 1 — 즉시 수정 (버그)

### STEP 1: [BUG-01] index.html home-tools-grid 미디어 쿼리 역전 수정
- 파일: `index.html` (line 284–286)
- 변경: `@media (max-width: 480px)` 블록에서 `.home-tools-grid { grid-template-columns: repeat(2, 1fr); }` 삭제 (700px 규칙의 1fr이 올바르게 적용되도록)

### STEP 2: [BUG-03] 모바일 GNB "Tools" 드롭다운 터치 접근 불가 수정
- 파일: `js/header.js` (line 160–179)
- 변경: `.gnb-has-sub > .gnb-link` 클릭 핸들러에서, 터치 기기에서 chevron 외 전체 링크 tap 시에도 드롭다운 토글되도록 수정
- 조건: `e.target.closest('.gnb-chevron')` 체크에서, 이미 서브메뉴가 닫혀있을 때 전체 `.gnb-link` tap → 서브 열기, href 이동은 서브가 이미 열려있을 때만

### STEP 3: [BUG-02] auth.js Naver 핸들러에서 isMobileDevice() 재사용
- 파일: `js/auth.js` (line 772–773)
- 변경: 인라인 `const isMobile = /Mobi|.../.test(...)` 를 `isMobileDevice()` 호출로 교체 (Safari 포함 일관성 확보)

### STEP 4: [BUG-04] auth-callback.html 불필요한 row-counter.js 제거
- 파일: `auth-callback.html`
- 변경: `<script type="module" src="/js/row-counter.js?v=10">` 및 `<knitting-row-counter>` 태그 삭제

---

## Phase 2 — 코드 품질 (중복/유지보수)

### STEP 5: [QUALITY-03] style.css 중복 header{} 레거시 규칙 제거
- 파일: `style.css` (미니파이된 블록 내 첫 번째 `header{text-align:center;padding:4rem...}`)
- 변경: 레거시 `header{}` 선언 제거 (두 번째 sticky nav 헤더 규칙만 유지)

### STEP 6: [QUALITY-04] notice.html initAuth/initLang 호출 통합
- 파일: `notice.html`
- 변경: 분리된 두 `<script>` 블록을 하나로 합쳐 `initAuth()` + `initLang()` 함께 호출

### STEP 7: [QUALITY-02] color-palette.html, projects.html authModal 패널 순서 정렬
- 파일: `color-palette.html`, `projects.html`
- 변경: verificationSentPanel ↔ profileSetupPanel 순서를 다른 페이지와 동일하게 (profileSetupPanel 먼저)

---

## 범위 외 (이번 계획에서 제외)

- QUALITY-01 (authModal 13개 파일 중복): 리팩토링 범위가 크므로 별도 계획 필요
- GNB 햄버거 메뉴 추가: 기존 디자인 결정(수평 스크롤 GNB)을 유지
