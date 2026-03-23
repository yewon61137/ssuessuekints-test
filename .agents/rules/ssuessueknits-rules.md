---
trigger: always_on
---

# SSUESSUE KNITS — Project Rules

## Stack
- Vanilla JS ES modules, no build system
- Firebase 10.14.1 (CDN ES modules) — Auth/DB/Storage
- Hosted on Cloudflare Pages
- Contact: Formspree

## 절대 규칙 — 도안 프라이버시
- 사용자가 생성한 도안은 본인만 열람/다운로드 가능
- 커뮤니티 게시글에 도안 이미지(patternImageURL) 절대 노출 금지
- posts 컬렉션에 patternImageURL, patternId 필드 추가 금지
- 타인 프로필 화면에 도안 관련 UI 렌더링 금지
- "커뮤니티 게시글에 도안 연결" 기능은 삭제된 기능 — 다시 추가 금지

## 다국어 — 필수
- 모든 텍스트는 한국어/영어/일본어 3개 동시 제공
- 하나라도 빠지면 작업 미완성
- 언어 설정: localStorage의 ssuessue_lang

## 보안
- Firebase API 키 하드코딩 금지 (firebase-config.js는 gitignore됨)
- innerHTML로 외부/Firestore 데이터 직접 렌더링 금지 → textContent 또는 createElement 사용
- 민감한 작업은 항상 getCurrentUser() 확인 후 진행
- 파일 업로드: MIME 타입 + 확장자 + 크기(10MB) 모두 검증

## 기능 변경 시 반드시 함께 수정
- notice.html — 새 기능/정책 변경 공지 (최신순, 맨 위 삽입)
- terms.html — 서비스 항목 변경
- guide.html — 사용법 변경
- privacy.html — 데이터 처리 변경
- 위 4개 파일 모두 ko/en/ja 3개 언어 반영

## 헤더/푸터
- index.html 기준으로 고정 — 임의 변경 금지
- 새 페이지 추가 시 기존 파일에서 헤더/푸터 블록 그대로 복사

## 파일 구조
- auth.js — Firebase 초기화, getCurrentUser()
- main.js — 도안 생성기, translations 객체
- community.js — 커뮤니티 피드
- post.js — 게시글 상세
- mypage.js — 마이페이지 4탭
- style.css — 전역 스타일
- firestore.rules / storage.rules — 보안 규칙

## Firestore 컬렉션
- users/{uid} — 프로필
- users/{uid}/patterns/{patternId} — 도안 (본인만 접근)
- posts/{postId} — 게시글
- posts/{postId}/comments/{commentId}/replies/{replyId}
- usernames/{nickname} — 닉네임 중복 방지

## 기타
- 모르면 모른다고 말할 것 — 추측으로 코드 지어내지 말 것