# SSUESSUE KNITS — Claude Guidelines

> [!IMPORTANT]
> **모든 개발 규칙은 [ssuessueknits-rules.md](file:///.agents/rules/ssuessueknits-rules.md)를 최우선으로 따릅니다.** 
> 특히 **선 계획 후 실행**, **인코딩 보존**, **헤더/푸터 유지** 규칙을 절대 준수하십시오.

## 🛠️ CLI & Build Commands
- **Environment Setup**: `sh build.sh` (Generates `firebase-config.js` from env vars)
- **Deployment**: Automatic via GitHub/Cloudflare Pages on `main` branch push.

## 📁 주요 파일 구조 (Core Structure)
- `auth.js`: Firebase 초기화 및 인증 로직
- `main.js`: 도안 생성기 엔진
- `style.css`: 전역 디자인 시스템
- `js/magazine-lang.js`: 매거진 다국어/네비게이션 제어

## 📋 작업 전 체크리스트
1.  `.agents/rules/ssuessueknits-rules.md`의 안전 수칙을 숙지했는가?
2.  수정 전 `implementation_plan.md`를 작성하고 승인받았는가?
3.  수정 후 UTF-8 인코딩 및 사이드 이펙트(헤더/푸터 등)를 확인했는가?
