# Fix all unsafe t.rollback() in activeServiceController.js with proper formatting
$file = "src/controllers/gym/service/activeServiceController.js"
$content = Get-Content $file

$newContent = @()
$i = 0
while ($i -lt $content.Count) {
    $line = $content[$i]
    
    # Check if line contains "await t.rollback();" and doesn't already have the check
    if ($line -match '^\s+await t\.rollback\(\);\s*$' -and 
        ($i -eq 0 -or $content[$i-1] -notmatch 'if \(t && !t\.finished\)')) {
        
        # Get indentation
        $indent = $line -replace '(^\s+).*', '$1'
        
        # Add the check before rollback
        $newContent += "$indent`if (t && !t.finished) {"
        $newContent += "$indent  await t.rollback();"
        $newContent += "$indent}"
    }
    else {
        $newContent += $line
    }
    
    $i++
}

$newContent | Set-Content $file

Write-Host "Fixed all t.rollback() calls in $file" -ForegroundColor Green
Write-Host "Total lines: $($newContent.Count)" -ForegroundColor Cyan
