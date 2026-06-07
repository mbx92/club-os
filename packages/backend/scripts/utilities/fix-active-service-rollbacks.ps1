# Fix all unsafe t.rollback() in activeServiceController.js
$file = "src/controllers/gym/service/activeServiceController.js"
$content = Get-Content $file -Raw

# Pattern: find "await t.rollback();" and replace with check
$pattern = '(?m)^(\s+)(await t\.rollback\(\);)$'
$replacement = '$1if (t && !t.finished) {$1  $2$1}'

$newContent = $content -replace $pattern, $replacement

Set-Content $file -Value $newContent -NoNewline

Write-Host "Fixed all t.rollback() calls in $file" -ForegroundColor Green
Write-Host "Replaced pattern: await t.rollback() → if (t && !t.finished) { await t.rollback(); }" -ForegroundColor Cyan
