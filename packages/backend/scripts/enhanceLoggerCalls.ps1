# PowerShell script to enhance logger calls across the codebase
# Adds ip: getClientIp(req) to all logger calls that have req parameter available

Write-Host "`n🔧 Enhancing logger calls with IP tracking...`n" -ForegroundColor Cyan

$files = @(
    "src\controllers\gym\transaction\transactionController.js",
    "src\services\transactionSettingsService.js",
    "src\services\voucherService.js",
    "src\services\servicePlanService.js",
    "src\services\sequenceService.js",
    "src\services\invoiceNumberService.js"
)

$totalUpdated = 0
$totalFiles = 0

foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot ".." $file
    
    if (-not (Test-Path $fullPath)) {
        Write-Host "  ⚠️  File not found: $file" -ForegroundColor Yellow
        continue
    }
    
    $content = Get-Content $fullPath -Raw
    $originalContent = $content
    
    # Check if file has req parameter (controller/middleware context)
    $hasReqParam = $content -match '\(req,\s*res' -or $content -match '\(req\)'
    
    if (-not $hasReqParam) {
        Write-Host "  ○ $file - No req parameter (service/utility)" -ForegroundColor Gray
        continue
    }
    
    # Pattern to find logger calls without IP
    # Matches: logger.logXXX('message', { ...meta... })
    $pattern = '(logger\.log(?:Info|Error|Security|Audit|Auth|Warn|System)\s*\([^,]+,\s*\{)([^}]+?)(\}\s*\))'
    
    $matches = [regex]::Matches($content, $pattern)
    $replacements = 0
    
    foreach ($match in $matches) {
        $fullMatch = $match.Value
        $prefix = $match.Groups[1].Value
        $meta = $match.Groups[2].Value
        $suffix = $match.Groups[3].Value
        
        # Skip if already has IP
        if ($meta -match '\bip:') {
            continue
        }
        
        # Add IP to the end of meta object
        $enhancedMeta = $meta.TrimEnd() + ",`n      ip: getClientIp(req)"
        $enhancedLog = $prefix + $enhancedMeta + $suffix
        
        $content = $content.Replace($fullMatch, $enhancedLog)
        $replacements++
    }
    
    if ($content -ne $originalContent) {
        Set-Content $fullPath -Value $content -NoNewline
        Write-Host "  ✓ $file - Enhanced $replacements logger call(s)" -ForegroundColor Green
        $totalUpdated += $replacements
        $totalFiles++
    }
    else {
        Write-Host "  ○ $file - No changes needed" -ForegroundColor Gray
    }
}

Write-Host "`n✅ Complete!" -ForegroundColor Green
Write-Host "   Updated: $totalUpdated logger calls in $totalFiles file(s)" -ForegroundColor Cyan
Write-Host ""
