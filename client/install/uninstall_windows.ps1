<#
.SYNOPSIS
    Unregisters and removes the EdgeShield PC Client Scheduled Task.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = "SilentlyContinue"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " EdgeShield PC Client - Windows Task Uninstaller" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$TaskName = "EdgeShieldClient"

try {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
} catch {
    # Fallback via schtasks.exe
    & schtasks.exe /End /TN $TaskName 2>$null | Out-Null
    & schtasks.exe /Delete /TN $TaskName /F 2>$null | Out-Null
}

Write-Host "[+] Scheduled Task '$TaskName' successfully removed." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
