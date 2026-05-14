# SSUESSUE KNITS - Mojibake / encoding corruption checker
# Scans text files for common signs of UTF-8 text decoded with the wrong code page.

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$extensions = @("*.html", "*.js", "*.css", "*.md", "*.xml", "*.json", "*.txt")
$excludedDirs = @("\.git\", "\node_modules\", "\.idx\", "\.vscode\", "\.firebase\", "\.wrangler\")

Write-Host "--- Scanning for potential mojibake in text files ---" -ForegroundColor Cyan

$files = foreach ($ext in $extensions) {
    Get-ChildItem -Path $root -Recurse -File -Filter $ext | Where-Object {
        $path = $_.FullName
        -not ($excludedDirs | Where-Object { $path.Contains($_) })
    }
}

$patterns = @(
    @{ Name = "replacement character"; Regex = [regex]"\uFFFD" },
    @{ Name = "latin mojibake markers"; Regex = [regex]"[\u00C3\u00C2][\u0080-\u00BF]?" },
    @{ Name = "non-ascii ? non-ascii"; Regex = [regex]"[^\x00-\x7F]\?[^\x00-\x7F]" },
    @{ Name = "three or more question marks"; Regex = [regex]"\?{3,}" }
)

$hits = @()
foreach ($file in $files) {
    if ($file.Name -eq "sw.js") { continue }

    $content = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
    foreach ($pattern in $patterns) {
        if ($pattern.Regex.IsMatch($content)) {
            $relative = Resolve-Path -LiteralPath $file.FullName -Relative
            $hits += [pscustomobject]@{
                File = $relative
                Reason = $pattern.Name
            }
            break
        }
    }
}

if ($hits.Count -eq 0) {
    Write-Host "No likely mojibake found." -ForegroundColor Green
} else {
    $hits | Sort-Object File | Format-Table -AutoSize
    Write-Host ("Potentially affected files: {0}" -f $hits.Count) -ForegroundColor Yellow
}

Write-Host "--- Scan complete ---" -ForegroundColor Cyan
