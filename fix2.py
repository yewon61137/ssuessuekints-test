# -*- coding: utf-8 -*-
import os

mag_dir = 'magazine'
files = sorted(os.listdir(mag_dir))

# 案(U+6848) + 내(U+B0B4) → 案内 (U+6848 + U+5185)
old = '\u6848\uB0B4'  # 案내
new = '\u6848\u5185'  # 案内

count = 0
for f in files:
    if not f.endswith('.html'):
        continue
    path = os.path.join(mag_dir, f)
    with open(path, 'r', encoding='utf-8') as fh:
        content = fh.read()
    if old in content:
        content = content.replace(old, new)
        with open(path, 'w', encoding='utf-8') as fh:
            fh.write(content)
        count += 1
        print('Fixed: ' + f)
print('Total: ' + str(count))
