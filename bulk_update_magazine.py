import os
import re

directory = 'magazine'
target_files = [
    '2026-crochet-fashion-trends.html',
    '2026-knitting-trends.html',
    'aran-knitting-symbols.html',
    'beginners-guide.html',
    'crochet-basics.html',
    'crochet-vs-knitting.html',
    'gauge-swatch-guide.html',
    'knitting-history-spy.html',
    'knitting-mental-health.html',
    'science-of-knitting-physics.html',
    'sustainable-knitting-slow-fashion.html',
    'yarn-care-guide.html',
    'yarn-weight-guide.html'
]

new_action_bar_html = """      <div class="post-action-bar mag-action-bar">
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
      </div>"""

def update_file(filename):
    filepath = os.path.join(directory, filename)
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Replace mag-share-bar
    if '<div class="mag-share-bar">' in content:
        content = re.sub(r'<div class="mag-share-bar">.*?</div>', new_action_bar_html, content, flags=re.DOTALL)
    else:
        print(f"Warning: mag-share-bar not found in {filename}")

    # 2. Remove magazine-share.js
    content = re.sub(r'<script src="/js/magazine-share.js"></script>\s*', '', content)

    # 3. Inject init script before </body>
    slug = filename.replace('.html', '')
    init_script = f"""  <script type="module">
    import {{ initMagazineArticle }} from '/js/magazine-article.js';
    const slug = window.location.pathname.split('/').pop().replace('.html', '') || '{slug}';
    initMagazineArticle(slug);
  </script>
</body>"""
    
    if '</body>' in content:
        # Avoid duplicate injection if already present
        if 'initMagazineArticle' not in content:
            content = content.replace('</body>', init_script)
        else:
            print(f"Warning: initMagazineArticle already exists in {filename}")
    else:
        print(f"Error: </body> not found in {filename}")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for filename in target_files:
    update_file(filename)
    print(f"Updated {filename}")
