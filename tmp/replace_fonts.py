import os
import glob

new_preloads = """  <link rel="preload" href="/fonts/GmarketSansTTFBold.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/GmarketSansTTFMedium.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/GmarketSansTTFLight.woff2" as="font" type="font/woff2" crossorigin>
"""

files = glob.glob('**/*.html', recursive=True)
count = 0
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        lines = file.readlines()
    
    new_lines = []
    inserted = False
    modified = False
    
    for line in lines:
        if 'webfontworld.github.io' in line:
            modified = True
            if not inserted:
                new_lines.append(new_preloads)
                inserted = True
            # skip the current line
        else:
            new_lines.append(line)
            
    if modified:
        with open(f, 'w', encoding='utf-8') as file:
            file.writelines(new_lines)
        count += 1
        print(f'Updated {f}')

print(f'Total HTML files updated: {count}')
