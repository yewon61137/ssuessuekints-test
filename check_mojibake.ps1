# SSUESSUE KNITS - Mojibake (Encoding Corruption) Checker
# This script scans HTML, JS, and CSS files for the '?' character inside Korean text blocks,
# which is a common sign of encoding corruption (UTF-8 to Windows-1252 mismatch).

$files = Get-ChildItem -Recurse -Include *.html, *.js, *.css -Exclude node_modules, .git, .idx, .vscode

Write-Host "--- Scanning for potential Mojibake (?) in UTF-8 files ---" -ForegroundColor Cyan

foreach ($file in $files) {
    if ($file.FullName -like "*sw.js") { continue } # Version numbers in sw.js use ? often
    
    $content = Get-Content $file.FullName -Raw
    if ($content -match "[ㄱ-ㅎㅏ-ㅣ가-힣].*?\?.*?[ㄱ-ㅎㅏ-ㅣ가-힣]" -or $content -match "\?{3,}") {
        Write-Host "[!] Potential corruption found in: $($file.FullName)" -ForegroundColor Red
    }
}

Write-Host "--- Scan Complete ---" -ForegroundColor Cyan
