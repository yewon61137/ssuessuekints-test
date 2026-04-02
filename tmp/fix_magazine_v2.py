import os
import re

directory = 'magazine'
files = [f for f in os.listdir(directory) if f.endswith('.html')]

# 액션바 및 댓글 섹션 템플릿
ACTION_BAR_HTML = """
      <div class="post-action-bar mag-action-bar">
        <button class="action-btn" id="likeBtn">
          <span class="action-icon">♥</span>
          <span id="likeBtnLabel">좋아요</span>
          <span id="likeCount">0</span>
        </button>
        <button class="action-btn" id="scrapBtn">
          <span class="action-icon">★</span>
          <span id="scrapBtnLabel">스크랩</span>
          <span id="scrapCount">0</span>
        </button>
        <button class="action-btn" id="shareBtn" style="margin-left:auto;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          <span id="shareBtnLabel">공유</span>
        </button>
      </div>

      <div class="comments-section">
        <h3 class="comments-title"><span class="comments-title-text">댓글</span> <span id="commentCountDisplay">0</span></h3>
        <div id="commentsList"></div>
        <div class="comment-form">
          <textarea id="commentInput" placeholder="댓글을 입력하세요..." maxlength="500" rows="2"></textarea>
          <button class="primary-btn small-btn" id="commentSubmitBtn">등록</button>
        </div>
      </div>
"""

INIT_SCRIPT_HTML = """
  <script type="module">
    import { initMagazineArticle } from '/js/magazine-article.js';
    const slug = window.location.pathname.split('/').pop().replace('.html', '');
    initMagazineArticle(slug);
  </script>
"""

for filename in files:
    filepath = os.path.join(directory, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. .mag-share-bar 찾아서 교체
    # <div class="mag-share-bar"> ... </div> 구조 탐색
    content = re.sub(r'<div class="mag-share-bar">.*?</div>', ACTION_BAR_HTML, content, flags=re.DOTALL)

    # 2. magazine-share.js 제거
    content = content.replace('<script src="/js/magazine-share.js"></script>', '')

    # 3. init script 주입 (</body> 바로 앞에 추가)
    if 'initMagazineArticle' not in content:
        content = content.replace('</body>', INIT_SCRIPT_HTML + '</body>')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print(f"Updated {len(files)} files.")
