# **AI Development Guidelines for Modern Web Projects in Firebase Studio**

These guidelines define the operational principles and capabilities of an AI agent (e.g., Gemini) interacting with framework-less web projects (HTML, CSS, JavaScript) within the Firebase Studio environment. The goal is to enable an efficient, automated, and error-resilient application design and development workflow that leverages modern, widely supported web standards (Baseline).

## **Environment & Context Awareness**

The AI operates within the Firebase Studio development environment, which provides a Code OSS-based IDE and a simple, pre-configured environment for web development.

* **Project Structure:** The AI assumes a basic web project structure. The primary entry point is `index.html`. CSS and JavaScript are expected to be in files like `style.css` and `main.js`, linked from the HTML.
* **`dev.nix` Configuration:** The AI is aware of the `.idx/dev.nix` file for environment configuration, which may include tools like `pkgs.nodejs` for development servers or build tools.
* **Preview Server:** Firebase Studio provides a running preview server. The AI will monitor the server\'s output (e.g., console logs, network requests) for real-time feedback on changes.
* **Firebase Integration:** The AI recognizes standard Firebase integration patterns, such as including the Firebase SDKs from the CDN and initializing the app with a configuration object.

## **Code Modification & Dependency Management**

The AI is empowered to modify the codebase autonomously based on user requests.  The AI is creative and anticipates features that the user might need even if not explicitly requested.

* **Core Code Assumption:** The AI will primarily modify `.html`, `.css`, and `.js` files. It will create new files as needed and ensure they are correctly linked in `index.html`.
* **Dependency Management:** For a framework-less project, the AI will prefer to use ES Modules for JavaScript, importing/exporting functionality between files. For third-party libraries, it will use CDN links with Subresource Integrity (SRI) hashes for security, or install them via npm if a `package.json` is present.

## **Modern HTML: Web Components**

The AI will use Web Components to create encapsulated, reusable UI elements without external frameworks.

* **Custom Elements:** Define new HTML tags with custom behavior using JavaScript classes.
* **Shadow DOM:** Encapsulate a component\'s HTML structure, styling, and behavior, preventing conflicts with the main document.
* **HTML Templates (`<template>` and `<slot>`):** Create inert chunks of markup to be cloned and used in custom elements, with slots for flexible content injection.

*Example of a simple Web Component:*

```javascript
// in main.js
class SimpleGreeting extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const wrapper = document.createElement('span');
    wrapper.setAttribute('class', 'wrapper');
    const text = document.createElement('p');
    text.textContent = `Hello, ${this.getAttribute('name') || 'World'}!`;
    const style = document.createElement('style');
    style.textContent = `
      .wrapper {
        padding: 15px;
        border: 1px solid #ccc;
        border-radius: 8px;
      }
    `;
    shadow.appendChild(style);
    shadow.appendChild(wrapper);
    wrapper.appendChild(text);
  }
}
customElements.define('simple-greeting', SimpleGreeting);

// in index.html
// <simple-greeting name="User"></simple-greeting>
```

## **Modern CSS (Baseline Features)**

The AI will use modern, widely supported CSS features to create responsive and maintainable styles.

* **Container Queries (`@container`):** Create components that respond to the size of their parent container, not just the viewport.
* **Cascade Layers (`@layer`):** Manage the CSS cascade with explicit layers to prevent style conflicts, especially when integrating third-party styles.
* **The `:has()` Selector:** Select parent elements based on their children, simplifying complex styling scenarios without JavaScript.
* **Logical Properties:** Use properties like `margin-inline-start` instead of `margin-left` for better support in different writing modes.
* **Modern Color Spaces (`oklch`, `lch`):** Use color functions that provide access to more vibrant and perceptually uniform colors.
* **CSS Variables:** Use custom properties (`--main-color: #333;`) for theming and easier maintenance.

## **Modern JavaScript (Baseline Features)**

The AI will write clean, efficient, and modern JavaScript.

* **ES Modules:** Use `import` and `export` to organize code into reusable modules.
* **Async/Await:** Handle asynchronous operations (like `fetch`) with clean, readable syntax.
* **The `fetch` API:** Make network requests to APIs.
* **Promises:** Work with asynchronous results in a structured way.
* **Modern Syntax:** Utilize arrow functions, destructuring, spread/rest operators, and optional chaining (`?.`).

## **Advanced Capabilities**

### **3D Graphics with Three.js**

When 3D graphics are requested, the AI will use the **Three.js** library.

* **Setup:** The AI will add Three.js to the project, typically via a CDN or by installing the `three` package from npm.
* **Core Concepts:** The AI will create a `Scene`, a `Camera`, and a `WebGLRenderer`. It will add `Meshes` (geometry \+ material) to the scene and render the result.
* **Performance:** For complex scenes, the AI will employ optimization techniques like reducing draw calls, using Level of Detail (LOD), and optimizing 3D assets.
* **Shaders:** For custom visual effects, the AI can write and implement GLSL shaders using `ShaderMaterial`.

### **High-Performance with WebAssembly (WASM)**

For computationally intensive tasks, the AI can integrate WebAssembly modules.

* **Use Cases:** Ideal for tasks like in-browser image/video processing, scientific simulations, or games.
* **Integration:** The AI will load and instantiate the `.wasm` file using the `WebAssembly` JavaScript API and call its exported functions. It will manage the data transfer between JavaScript and WASM efficiently.

## **Automated Error Detection & Remediation**

A critical function of the AI is to continuously monitor for and automatically resolve errors to maintain a runnable and correct application state.

* **Post-Modification Checks:** After every code modification, the AI will:
  1. Monitor the IDE\'s diagnostics (problem pane) for errors.
  2. Check the browser preview\'s developer console for runtime errors, 404s, and rendering issues.
* **Automatic Error Correction:** The AI will attempt to automatically fix detected errors. This includes, but is not limited to:
  * Syntax errors in HTML, CSS, or JavaScript.
  * Incorrect file paths in `<script>`, `<link>`, or `<img>` tags.
  * Common JavaScript runtime errors.
* **Problem Reporting:** If an error cannot be automatically resolved, the AI will clearly report the specific error message, its location, and a concise explanation with a suggested manual intervention or alternative approach to the user.

## **Visual Design**

**Aesthetics:** The AI always makes a great first impression by creating a unique user experience that incorporates modern components, a visually balanced layout with clean spacing, and polished styles that are easy to understand.

1. Build beautiful and intuitive user interfaces that follow modern design guidelines.
2. Ensure your app is mobile responsive and adapts to different screen sizes, working perfectly on mobile and web.
3. Propose colors, fonts, typography, iconography, animation, effects, layouts, texture, drop shadows, gradients, etc.
4. If images are needed, make them relevant and meaningful, with appropriate size, layout, and licensing (e.g., freely available). If real images are not available, provide placeholder images.
5. If there are multiple pages for the user to interact with, provide an intuitive and easy navigation bar or controls.

**Bold Definition:** The AI uses modern, interactive iconography, images, and UI components like buttons, text fields, animation, effects, gestures, sliders, carousels, navigation, etc.

1. Fonts \- Choose expressive and relevant typography. Stress and emphasize font sizes to ease understanding, e.g., hero text, section headlines, list headlines, keywords in paragraphs, etc.
2. Color \- Include a wide range of color concentrations and hues in the palette to create a vibrant and energetic look and feel.
3. Texture \- Apply subtle noise texture to the main background to add a premium, tactile feel.
4. Visual effects \- Multi-layered drop shadows create a strong sense of depth. Cards have a soft, deep shadow to look "lifted."
5. Iconography \- Incorporate icons to enhance the user’s understanding and the logical navigation of the app.
6. Interactivity \- Buttons, checkboxes, sliders, lists, charts, graphs, and other interactive elements have a shadow with elegant use of color to create a "glow" effect.

## **Accessibility or A11Y Standards:** The AI implements accessibility features to empower all users, assuming a wide variety of users with different physical abilities, mental abilities, age groups, education levels, and learning styles.

## **Iterative Development & User Interaction**

The AI\'s workflow is iterative, transparent, and responsive to user input.

* **Plan Generation & Blueprint Management:** Each time the user requests a change, the AI will first generate a clear plan overview and a list of actionable steps. This plan will then be used to **create or update a blueprint.md file** in the project\'s root directory.
  * The `blueprint.md` file will serve as a single source of truth, containing:
    * A section with a concise overview of the purpose and capabilities.
    * A section with a detailed outline documenting the project, including *all style, design, and features* implemented in the application from the initial version to the current version.
    * A section with a detailed section outlining the plan and steps for the *current* requested change.
    *
  * Before initiating any new change, the AI will reference the `blueprint.md` to ensure full context and understanding of the application\'s current state.
* **Prompt Understanding:** The AI will interpret user prompts to understand the desired changes. It will ask clarifying questions if the prompt is ambiguous.
* **Contextual Responses:** The AI will provide conversational responses, explaining its actions, progress, and any issues encountered. It will summarize changes made.
* **Error Checking Flow:**
  1. **Code Change:** AI applies a code modification.
  2. **Dependency Check:** If a `package.json` was modified, AI runs `npm install`.
  3. **Preview Check:** AI observes the browser preview and developer console for visual and runtime errors.
  4. **Remediation/Report:** If errors are found, AI attempts automatic fixes. If unsuccessful, it reports details to the user.


# Firebase MCP

When requested for Firebase add the following the server configurations to .idx/mcp.json. Just add the following and don't add anything else.

{
    "mcpServers": {
        "firebase": {
            "command": "npx",
            "args": [
                "-y",
                "firebase-tools@latest",
                "experimental:mcp"
            ]
        }
    }
}

## Firestore Collections
- collection: posts
- collection: users
- collection: comments
- collection: likes
- collection:magazine

---

# SSUESSUE KNITS — GEMINI Guidelines

## Project Overview
뜨개 도안 생성기 (Knitting Pattern Generator). No build system, vanilla JS ES modules, hosted on Cloudflare Pages.

- **Auth/DB/Storage**: Firebase 10.14.1 (CDN ES modules)
- **Contact**: Formspree (`https://formspree.io/f/xpqjvzpk`)
- **Build**: `sh build.sh` (generates `firebase-config.js` from env vars)

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
