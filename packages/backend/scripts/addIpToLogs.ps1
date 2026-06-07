# Enhanced logger with IP - Simple version
Write-Host "`n🔧 Adding IP to logger calls...`n" -ForegroundColor Cyan

$files = @(
    "src\controllers\gym\transaction\transactionController.js"
)

foreach ($file in $files) {
    $path = Join-Path (Split-Path $PSScriptRoot) $file
    
    if (Test-Path $path) {
        $content = Get-Content $path -Raw
        $original = $content
        
        # Add IP to logger calls that don't have it
        $pattern = '(logger\.log\w+\([^,]+,\s*\{[^}]+?)(\})'
        
        $content = [regex]::Replace($content, $pattern, {
            param($match)
            $meta = $match.Groups[1].Value
            $close = $match.Groups[2].Value
            
            if ($meta -match '\bip:') {
                return $match.Value
            }
            
            return $meta + ",`n      ip: getClientIp(req)" + $close
        })
        
        if ($content -ne $original) {
            Set-Content $path -Value $content -NoNewline
            Write-Host "✓ Updated: $file" -ForegroundColor Green
        }
        else {
            Write-Host "○ No changes: $file" -ForegroundColor Gray
        }
    }
}

Write-Host "`n✅ Done!`n" -ForegroundColor Green
