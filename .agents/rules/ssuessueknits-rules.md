---
trigger: always_on
---

# SSUESSUE KNITS — Project Rules

## 🛡️ AI 행위 및 안전 원칙 (AI Integrity & Safety) — 필수 준수
- **선 계획 후 실행 (No Plan, No Edit)**: 어떠한 코드 수정이라도 실행 전에 반드시 계획(`implementation_plan.md`)을 세우고 사용자의 승인을 얻을 것.
- **기존 로직 존중**: 다른 AI나 사용자가 작성한 코드를 수정할 때 기존 의도와 다국어 처리가 파괴되지 않도록 영향 범위를 먼저 분석할 것.
- **사이트 구조 보존**: `index.html` 기준의 헤더/푸터 블록을 임의로 수정하지 말 것. 새 페이지 추가 시 기존 파일에서 헤더/푸터 블록을 그대로 복사해 사용함.
- **인코딩(UTF-8) 유지**: 모든 파일은 UTF-8(BOM 없음) 형식을 유지해야 하며, 한국어/일본어 텍스트가 깨지지 않도록 절대 주의할 것.
- **정직성**: 모르는 부분이나 확실하지 않은 로직은 추측하여 지어내지 말고 솔직하게 "모른다"고 답할 것.

## 0. 도안 프라이버시 — 절대 규칙
- **개인 소유**: 사용자가 생성한 도안은 본인만 열람/다운로드 가능.
- **노출 금지**: 커뮤니티 게시글 및 타인 프로필 화면에 도안 이미지(`patternImageURL`) 절대 노출 금지.
- **필드 제한**: `posts` 컬렉션에 `patternImageURL`, `patternId` 필드 추가 절대 금지.
- **기능 삭제**: "커뮤니티 게시글에 도안 연결" 기능은 삭제됨 — 다시 추가하지 말 것.

## 1. 다국어 (i18n) — 필수
- **3개 국어**: 모든 텍스트는 한국어/영어/일본어 3개 동시 제공 필수 (하나라도 누락 시 미완성).
- **설정**: `localStorage`의 `ssuessue_lang` 값을 기준으로 언어 전환.

## 2. 보안
- **Firebase**: API 키 하드코딩 금지 (`firebase-config.js`는 gitignore됨).
- **XSS 방지**: `innerHTML` 대신 `textContent` 또는 `createElement` 사용. 외부 데이터 렌더링 시 반드시 검증/Sanitize.
- **인증**: 민감한 작업은 항상 `getCurrentUser()` 확인 후 진행.
- **파일**: 업로드 시 MIME 타입 + 확장자 + 크기(10MB) 모두 검증.

## 3. 기능 변경 시 동시 수정 파일
- 신규 기능 출시, 정책/UI 변경 시 아래 4개 파일을 **반드시 3개 국어로 동시 업데이트**할 것.
    1. `notice.html` (공지사항 - 최신 작성글이 맨 위로)
    2. `terms.html` (이용약관)
    3. `guide.html` (이용안내)
    4. `privacy.html` (개인정보처리방침)

## 4. 파일 및 데이터 구조
- **핵심 로직**: `auth.js`(인증), `main.js`(도안 생성), `community.js`(피드), `post.js`(상세), `mypage.js`(사용자 정보), `style.css`(스타일).
- **Firestore 컬렉션**:
    - `users/{uid}`: 프로필
    - `users/{uid}/patterns/{patternId}`: 도안 (본인 전용)
    - `posts/{postId}`: 커뮤니티 게시글
    - `posts/{postId}/comments/{commentId}/replies/{replyId}`: 댓글/답글
    - `usernames/{nickname}`: 닉네임 중복 방지용
    - `magazine`: 매거진 아티클 정보