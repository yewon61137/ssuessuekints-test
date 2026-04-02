import re

def remove_thumbnails(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove the thumbnail div lines
    # Example: <div class="article-thumb"><img src="/magazine/images/mag_history.png" alt="Knitting History" loading="lazy"></div>
    content = re.sub(
        r'\s*<div class="article-thumb"><img src="/magazine/images/mag_[^"]+" alt="[^"]*" loading="lazy"></div>\n',
        '',
        content
    )

    # Remove related CSS lines
    content = re.sub(r'^\s*\.article-thumb \{.*?\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'^\s*\.article-thumb img \{.*?\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'^\s*\.article-card:hover \.article-thumb img \{.*?\n', '', content, flags=re.MULTILINE)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

remove_thumbnails('magazine.html')
print("Thumbnails removed successfully.")
