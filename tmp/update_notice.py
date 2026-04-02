
import re

with open('notice.html', 'r', encoding='utf-8') as f:
    html = f.read()

def replacer(match):
    badge = match.group(1).strip()
    date = match.group(2).strip()
    title = match.group(3).strip()
    body = match.group(4).strip()
    
    return f'''<details class="notice-item">
          <summary class="notice-summary">
            <div class="notice-header">
              <span class="notice-badge">{badge}</span>
              <time class="notice-time">{date}</time>
            </div>
            <div class="notice-title-row">
              <h3 class="notice-title">{title}</h3>
              <span class="notice-icon">¡å</span>
            </div>
          </summary>
          <div class="notice-body">
            {body}
          </div>
        </details>'''

pattern = re.compile(
    r'<article[^>]*>.*?<span[^>]*>(.*?)</span>.*?<time[^>]*>(.*?)</time>.*?<h3[^>]*>(.*?)</h3>.*?<div[^>]*>(.*?)</div>\s*</article>',
    re.DOTALL
)

html = pattern.sub(replacer, html)

html = html.replace('<div data-lang-section="ko" style="margin-top:1rem;">', '<div data-lang-section="ko" class="notice-list">')
html = html.replace('<div data-lang-section="en" style="display:none;margin-top:1rem;">', '<div data-lang-section="en" class="notice-list" style="display:none;">')
html = html.replace('<div data-lang-section="ja" style="display:none;margin-top:1rem;">', '<div data-lang-section="ja" class="notice-list" style="display:none;">')

with open('notice.html', 'w', encoding='utf-8') as f:
    f.write(html)

