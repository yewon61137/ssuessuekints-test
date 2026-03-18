# Blueprint: SSUESSUE KNITS (뜨개질 도안 생성기 & 스마트 도구함)

## 1. 개요 (Overview)
사용자가 이미지를 업로드하고 원하는 편물의 크기(cm) 및 실 굵기를 선택하면, 표준 게이지를 바탕으로 자동으로 코/단 수를 계산하고 이미지를 배치하여 뜨개질 도안으로 변환해주는 웹 애플리케이션입니다. 추가적으로 뜨개질에 필요한 게이지 계산기 및 균등 늘림/줄임 계산 도구를 제공합니다.

## 2. 주요 기능 (Features)
*   **이미지 업로드**: JPG, PNG 형식의 이미지 업로드 지원 (최대 10MB).
*   **필수 색상 선택**: 이미지에서 반드시 도안에 포함하고 싶은 색상을 스포이드 방식으로 선택 가능.
*   **AI 도안 생성**:
    *   K-means++ 알고리즘을 사용한 지능적 색상 군집화.
    *   실 굵기(표준 규격 또는 mm)에 따른 게이지 자동 계산.
    *   기법 비율 설정 (코바늘 1:1, 대바늘 5:7 또는 7:5).
*   **게이지 계산기 (Smart Knitting Toolkit)**:
    *   **게이지 스와치 계산**: 목표 사이즈(cm)와 본인의 게이지를 입력하면 필요한 총 코/단 수 자동 계산.
    *   **균등 늘림/줄임 계산**: 현재 코 수와 늘릴/줄일 코 수를 입력하면 균등한 간격을 계산하여 상세 작업 지침 제공.
*   **단수 카운터 (Row Counter) 사이드 드로어**:
    *   어떤 페이지에서든 접근 가능한 부유형 버튼(FAB)과 사이드 드로어 UI.
    *   여러 개의 카운터 생성 및 관리 기능.
    *   **일반 모드**: 단순 누적 단수 카운팅.
    *   **반복 모드**: "3단마다 반복"과 같은 복잡한 도안을 위한 기능. 현재 반복 횟수와 반복 내 현재 단수를 동시에 관리.
    *   증감(+/-), 초기화(Reset), 이름 수정, 삭제 기능.
    *   브라우저 로컬 스토리지(`localStorage`)를 통한 데이터 유지.
*   **도안 관리 및 공유**:
    *   생성된 도안을 PDF 또는 PNG로 다운로드.
    *   회원 가입 시 내 도안 보관함에 저장 및 관리.
    *   커뮤니티를 통한 작품 공유 및 소통 (좋아요, 스크랩, 댓글/답글 기능).
*   **다국어 지원**: 한국어, 영어, 일본어 완전 지원.

## 3. 기술 스택 (Tech Stack)
*   **Frontend**: Vanilla JS (ES Modules), HTML5, CSS3 (Modern Baseline).
*   **Backend/BaaS**: Firebase (Auth, Firestore, Storage).
*   **Deployment**: Cloudflare Pages.
*   **Libraries**: jsPDF (PDF 생성).

## 4. SEO 및 GEO 최적화 (SEO & GEO Optimization)
*   **Search Engine Optimization (SEO)**:
    *   `robots.txt` 및 `sitemap.xml` 생성 및 연동.
    *   메인 페이지 및 주요 페이지에 Open Graph (OG), Twitter Cards, Canonical, Hreflang 태그 적용.
    *   JSON-LD 구조화 데이터 삽입으로 검색 결과 노출 강화.
*   **Geographic Optimization (GEO)**:
    *   `hreflang` 태그를 활용한 다국어(ko, en, ja) 타겟팅 최적화.

## 5. 외부 서비스 연동 (External Integrations)
*   **Google Analytics (GA4)**: 사용자 행동 분석 (ID: G-KSBJ5J8N4K).
*   **Microsoft Clarity**: UX 분석 및 히트맵 (ID: vsvc6kadap).
*   **Google AdSense**: 수익 창출 연동 완료.
*   **Formspree**: 고객 문의(Contact) 양식 연동.

---
*Last Updated: 2026-03-18*
