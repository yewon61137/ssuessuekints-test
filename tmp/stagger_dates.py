import os
import re

mapping = {
    "knitting-history-spy.html": ("2026-03-30", "2026년 3월 30일", "March 30, 2026", "2026年3月30日"),
    "science-of-knitting-physics.html": ("2026-03-27", "2026년 3월 27일", "March 27, 2026", "2026年3月27日"),
    "knitting-mental-health.html": ("2026-03-24", "2026년 3월 24일", "March 24, 2026", "2026年3月24日"),
    "2026-crochet-fashion-trends.html": ("2026-03-20", "2026년 3월 20일", "March 20, 2026", "2026年3月20日"),
    "sustainable-knitting-slow-fashion.html": ("2026-03-17", "2026년 3월 17일", "March 17, 2026", "2026年3月17日"),
    "aran-knitting-symbols.html": ("2026-03-14", "2026년 3월 14일", "March 14, 2026", "2026年3月14日"),
    "crochet-basics.html": ("2026-03-10", "2026년 3월 10일", "March 10, 2026", "2026年3月10日"),
    "gauge-swatch-guide.html": ("2026-03-05", "2026년 3월 05일", "March 5, 2026", "2026年3月5일"),
    "amigurumi-beginners.html": ("2026-02-28", "2026년 2월 28일", "February 28, 2026", "2026年2月28日"),
    "yarn-care-guide.html": ("2026-02-20", "2026년 2월 20일", "February 20, 2026", "2026年2月20日"),
    "2026-knitting-trends.html": ("2026-02-10", "2026년 2월 10일", "February 10, 2026", "2026年2月10日"),
    "beginners-guide.html": ("2026-01-30", "2026년 1월 30일", "January 30, 2026", "2026年1月30日"),
    "crochet-vs-knitting.html": ("2026-01-15", "2026년 1월 15일", "January 15, 2026", "2026年1月15日"),
    "yarn-weight-guide.html": ("2026-01-05", "2026년 1월 05일", "January 5, 2026", "2026年1月5일"),
}

mag_dir = r"d:\김예원⭐❤️🐸\ssuessuekints-test\magazine"

for filename, dates in mapping.items():
    filepath = os.path.join(mag_dir, filename)
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        continue
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Update datePublished
    content = re.sub(r'"datePublished":\s*"[^"]+"', f'"datePublished": "{dates[0]}"', content)
    
    # Update article-meta data-ko, data-en, data-ja
    # Using a slightly looser regex to capture variations in spacing
    content = re.sub(r'data-ko="([^"]*)2026년 3월 30일"', rf'data-ko="\1{dates[1]}"', content)
    content = re.sub(r'data-en="March 30, 2026([^"]*)"', rf'data-en="{dates[2]}\1"', content)
    content = re.sub(r'data-ja="2026年3月30日([^"]*)"', rf'data-ja="{dates[3]}\1"', content)
    
    # Update text content inside the p tag (it usually matches article-meta)
    # We'll just replace 2026년 3월 30일 in the whole file where it's likely a date
    content = content.replace("2026년 3월 30일", dates[1])
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Updated {filename}")
