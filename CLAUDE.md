# SSUESSUE KNITS — Claude Code Guidelines

## Project Overview
뜨개 도안 생성기 (Knitting Pattern Generator). No build system, vanilla JS ES modules, hosted on Cloudflare Pages.

- **Auth/DB/Storage**: Firebase 10.14.1 (CDN ES modules)
- **Contact**: Formspree (`https://formspree.io/f/xpqjvzpk`)
- **Build**: `sh build.sh` (generates `firebase-config.js` from env vars)

---

## 0. 도안 프라이버시 — 절대 규칙

**사용자가 생성한 도안은 무조건 본인만 열람·다운로드할 수 있다. 저작권 보호.**

### 적용 범위
| 레이어 | 규칙 |
|--------|------|
| Firestore rules | `users/{uid}/patterns/{patternId}` read/write → `request.auth.uid == userId` 만 허용 |
| Storage rules | `users/{uid}/patterns/{patternId}/{filename}` read/write → `request.auth.uid == userId` 만 허용 |
| community.js / post.js / home.js | 커뮤니티 게시글 카드/상세에 도안 이미지(`patternImageURL`) 노출 금지 — 완전히 제거됨 |
| mypage.js | 타인 프로필(`?uid=`) 보기 시 `내 도안함` 탭 숨김, 사이드바 도안 통계 숨김 |

### 지켜야 할 구현 규칙
- **"커뮤니티 게시글에 도안 연결하기" 기능은 삭제됨.** 다시 추가하지 말 것.
- `posts` 컬렉션 문서에 `patternImageURL`, `patternId` 필드를 추가하는 코드를 작성하지 말 것.
- 도안 관련 UI(썸네일, PDF/PNG 버튼, 도안 탭)를 어떤 형태로든 새로 추가할 때 반드시 본인(`currentUser.uid === ownerUid`) 전용으로 제한해야 한다.
- 타인이 볼 수 있는 화면(커뮤니티 피드, 게시글 상세, 타인 프로필)에 도안 이미지·데이터를 렌더링하는 코드를 추가하면 안 된다.

---

## 1. 헤더 & 푸터 — 내용 고정

모든 페이지의 헤더와 푸터 구조는 **index.html 기준**으로 고정되어 있다.
새 페이지를 추가하거나 기존 페이지를 수정할 때 헤더/푸터 내용을 임의로 변경하지 말 것.

### 헤더 고정 항목
- 언어 선택 드롭다운 (한국어 / English / 日本語)
- 네비게이션 링크: 소개 / 커뮤니티 / 매거진 / 공지사항 / 이용안내
- 로그인 버튼 / 마이페이지·로그아웃 (로그인 시)
- 햄버거 메뉴 (모바일)
- 브랜드명 `SSUESSUE KNITS` + `쓔쓔닛츠`

### 푸터 고정 항목
```html
<footer class="site-footer">
  <div class="footer-inner">
    <span class="footer-brand">SSUESSUE KNITS</span>
    <nav class="footer-nav">
      <a href="/about.html" data-i18n="footer_about">소개</a>
      <a href="/terms.html" data-i18n="footer_terms">이용약관</a>
      <a href="/privacy.html" data-i18n="footer_privacy">개인정보처리방침</a>
    </nav>
  </div>
  <div class="footer-biz"> ... </div>
</footer>
```

새 페이지 추가 시 기존 HTML 파일에서 헤더/푸터 블록을 그대로 복사할 것.

---

## 2. 다국어 (ko / en / ja) — 필수

모든 사용자에게 보이는 텍스트는 **한국어 · 영어 · 일본어 세 가지를 동시에 제공**해야 한다.
하나라도 빠지면 작업 미완성으로 간주한다.

### i18n 패턴 (페이지별 적용)

**방식 A — `data-i18n` 키 (main.js `translations` 객체)**
```html
<button data-i18n="btn_save">저장</button>
```
```js
// main.js translations 객체에 세 언어 모두 추가
btn_save: { ko: '저장', en: 'Save', ja: '保存' }
```

**방식 B — inline `data-ko/en/ja` + `.i18n` 클래스 (다른 페이지)**
```html
<span class="i18n" data-ko="저장" data-en="Save" data-ja="保存">저장</span>
```

**방식 C — `tMap` 객체 (community.js, post.js 등)**
```js
const tMap = {
  ko: { save: '저장' },
  en: { save: 'Save' },
  ja: { save: '保存' },
};
```

새 텍스트 추가 시 해당 페이지가 사용하는 방식을 따를 것.
`localStorage`의 언어 설정(`ssuessue_lang`)을 읽어 초기 언어를 결정한다.

---

## 3. 보안 — 최우선

### Firebase / Firestore
- 클라이언트에서 **절대 Firebase API 키를 하드코딩하지 말 것** — `firebase-config.js`는 gitignore됨, 빌드 시 env vars에서 생성
- Firestore 규칙(`firestore.rules`)은 최소 권한 원칙을 따름:
  - 본인 데이터(`request.auth.uid == userId`)만 write 허용
  - 공개 데이터 read는 `true`, 나머지는 인증 필수
- 규칙 변경 시 반드시 **의도하지 않은 write 권한 확대**가 없는지 검토

### XSS 방지
- 사용자 입력을 DOM에 삽입할 때 `innerHTML` 대신 `textContent` 또는 `createElement` 사용
- 불가피하게 HTML을 삽입할 경우 반드시 sanitize (DOMPurify 또는 수동 이스케이프)
- `innerHTML`로 외부 데이터(Firestore 데이터 포함)를 직접 렌더링하지 말 것

### 인증
- 민감한 작업(도안 저장, 게시글 작성, 댓글 등)은 항상 `getCurrentUser()` 확인 후 진행
- 클라이언트 측 인증 체크만으로 보안을 보장하지 말 것 — Firestore 규칙이 최후 방어선
- 이메일/닉네임 등 PII는 로그에 출력하지 말 것

### 입력 검증
- 파일 업로드: MIME 타입 + 확장자 + 크기(10MB) 모두 검증
- 닉네임/댓글 등 텍스트: 길이 제한 + 특수문자 처리
- URL 파라미터(`?lang=`, `?id=` 등)는 허용 값 화이트리스트로 검증

### Storage
- `storage.rules`에서 인증된 사용자의 본인 경로(`users/{uid}/...`)에만 write 허용
- 업로드 파일은 이미지 타입(`image/jpeg`, `image/png`)만 허용

---

## 4. 기능 변경 시 문서 동기화 — 필수

기능이 **추가·변경·삭제**될 때마다 아래 4개 파일을 **반드시 함께 업데이트**해야 한다.
코드만 바꾸고 문서를 방치하면 작업 미완성으로 간주한다.

| 파일 | 업데이트 트리거 예시 |
|------|----------------------|
| `notice.html` | 새 기능 출시, 정책 변경, 주요 업데이트 → 새 공지 article 추가 (최신순) |
| `terms.html` | 로그인 수단 추가/삭제, 서비스 항목 변경, 커뮤니티 규칙 변경 |
| `guide.html` | 신규 기능 사용법 추가, UI 변경으로 안내 내용이 달라질 때 |
| `privacy.html` | 새 OAuth 제공자 추가, 수집 데이터 변경, 제3자 서비스 추가/삭제 |

### 규칙 세부
- **notice.html**: 새 공지는 각 언어 섹션의 **맨 위**에 삽입 (최신순 유지). 날짜는 실제 변경일로.
- **3개 언어 동시**: 모든 업데이트는 ko / en / ja 세 언어 섹션 모두 반영.
- **기능 변경 체크리스트** (코드 수정 완료 후):
  - [ ] notice.html에 공지 추가했는가?
  - [ ] terms.html에 해당 조항 반영했는가?
  - [ ] guide.html에 사용법 추가/수정했는가?
  - [ ] privacy.html에 데이터 처리 내용 반영했는가?

---

## 주요 파일 구조
```
auth.js          — Firebase 초기화, exports: auth, db, storage, initAuth(), getCurrentUser()
main.js          — 도안 생성기 (index.html), translations 객체 포함
community.js     — 커뮤니티 피드
post.js          — 게시글 상세
mypage.js        — 마이페이지 4탭
style.css        — 전역 스타일
firebase-config.js — gitignored, build.sh로 생성
firestore.rules  — Firestore 보안 규칙
storage.rules    — Storage 보안 규칙
```

## Firestore 컬렉션
- `users/{uid}` — 프로필
- `users/{uid}/patterns/{patternId}` — 도안
- `users/{uid}/likes/{postId}`, `scraps/{postId}`
- `posts/{postId}` — 게시글
- `posts/{postId}/comments/{commentId}/replies/{replyId}`
- `usernames/{nickname}` — 닉네임 중복 방지
