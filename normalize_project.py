import os
import re

# Microsoft Clarity Script (Deferred)
CLARITY_SCRIPT = """
  <!-- Microsoft Clarity (deferred) -->
  <script>
    window.addEventListener("load", function() {
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window,document,"clarity","script","vsvc6kadap");
    });
  </script>
"""

def normalize_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 1. Update style.css?v=X and header.js?v=X to v=10
        # Specifically targeting common project patterns
        content = re.sub(r'style\.css(\?v=\d+)?', 'style.css?v=10', content)
        content = re.sub(r'header\.js(\?v=\d+)?', 'header.js?v=10', content)
        content = re.sub(r'auth\.js(\?v=\d+)?', 'auth.js?v=10', content)
        content = re.sub(r'i18n\.js(\?v=\d+)?', 'i18n.js?v=10', content)
        
        # 2. Inject Clarity if missing
        if 'clarity.ms' not in content:
            if '</head>' in content:
                content = content.replace('</head>', CLARITY_SCRIPT + '</head>')
            elif '</body>' in content:
                content = content.replace('</body>', CLARITY_SCRIPT + '</body>')
        
        # 3. Ensure UTF-8 with BOM for Windows compatibility if preferred, but standard UTF-8 is fine
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    except Exception as e:
        print(f"Error normalizing {file_path}: {e}")
        return False

def main():
    html_files = []
    for root, dirs, files in os.walk('.'):
        for name in files:
            if name.endswith('.html') and not any(x in root for x in ['.git', '.idx', '.vscode', 'node_modules']):
                html_files.append(os.path.join(root, name))
    
    print(f"Normalizing {len(html_files)} files...")
    success_count = 0
    for f in html_files:
        if normalize_file(f):
            success_count += 1
    
    print(f"Successfully normalized {success_count}/{len(html_files)} files.")

if __name__ == "__main__":
    main()
