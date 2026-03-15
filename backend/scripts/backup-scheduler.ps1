# PowerShell script for Windows Task Scheduler
# This script runs the backup check every 3 days

$ErrorActionPreference = "Stop"

# Get the script directory (backend/scripts)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Split-Path -Parent $ScriptDir

# Change to backend directory
Set-Location $BackendDir

Write-Host "Backup Scheduler Script"
Write-Host "======================"
Write-Host "Script location: $ScriptDir"
Write-Host "Backend directory: $BackendDir"
Write-Host ""

# Run the backup script
Write-Host "Running backup check..."
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "Directory: $BackendDir"
Write-Host ""

try {
    node scripts/backup.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Backup check completed successfully"
    } else {
        Write-Host ""
        Write-Host "❌ Backup check failed with exit code: $LASTEXITCODE"
        exit $LASTEXITCODE
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error running backup: $_"
    exit 1
}

