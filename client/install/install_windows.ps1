<#
.SYNOPSIS
    Registers the EdgeShield PC Client Agent as a Windows Scheduled Task.

.DESCRIPTION
    By default, registers a task to trigger "At log on" for the current user (no administrator
    rights required in most standard environments).
    If invoked with -AtStartup, registers to run at system boot under SYSTEM (requires Administrator privileges).
    Executes in the background via pythonw.exe without keeping a visible console or CMD window open.

.PARAMETER AtStartup
    Registers the task to trigger at system boot under SYSTEM instead of user logon (requires Admin).

.EXAMPLE
    .\install_windows.ps1
    # Registers task to run at logon for current user (windowless background)

.EXAMPLE
    .\install_windows.ps1 -AtStartup
    # Run in an elevated Administrator PowerShell to launch at system boot
#>
[CmdletBinding()]
param(
    [switch]$AtStartup
)

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " EdgeShield PC Client - Windows Task Installer" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Resolve paths (self-contained within client folder)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ClientDir = (Resolve-Path (Join-Path $ScriptDir "..")).Path
$ClientScript = (Resolve-Path (Join-Path $ClientDir "client.py")).Path

if (-not (Test-Path $ClientScript)) {
    Write-Error "Could not locate client.py at $ClientScript"
}

# 2. Check for .env file
$EnvFile = Join-Path $ClientDir ".env"
$EnvExample = Join-Path $ClientDir ".env.example"
if (-not (Test-Path $EnvFile)) {
    Write-Warning "$EnvFile not found."
    if (Test-Path $EnvExample) {
        Write-Host "Copying .env.example to .env..." -ForegroundColor Yellow
        Copy-Item $EnvExample $EnvFile
        Write-Host "Please edit $EnvFile to configure SERVER_IP, DEVICE_ID, and ROOM." -ForegroundColor Yellow
    }
}

# 3. Detect Python interpreter:
#    Primary: pythonw.exe in dedicated client/.venv for silent background operation (no visible console window).
#    Fallback: python.exe in client/.venv only if pythonw is missing.
#    Further fallback: system PATH pythonw.exe / python.exe.
$PythonW_Candidates = @(
    (Join-Path $ClientDir ".venv\Scripts\pythonw.exe"),
    (Join-Path $ClientDir "venv\Scripts\pythonw.exe"),
    (Join-Path $ClientDir "..\.venv\Scripts\pythonw.exe")
)

$Python_Candidates = @(
    (Join-Path $ClientDir ".venv\Scripts\python.exe"),
    (Join-Path $ClientDir "venv\Scripts\python.exe"),
    (Join-Path $ClientDir "..\.venv\Scripts\python.exe")
)

$PythonExe = $null

# Check for pythonw.exe (windowless background)
foreach ($Candidate in $PythonW_Candidates) {
    if (Test-Path $Candidate) {
        $PythonExe = (Resolve-Path $Candidate).Path
        break
    }
}

# Fallback to python.exe in venv
if (-not $PythonExe) {
    foreach ($Candidate in $Python_Candidates) {
        if (Test-Path $Candidate) {
            $PythonExe = (Resolve-Path $Candidate).Path
            break
        }
    }
}

# Fallback to system PATH
if (-not $PythonExe) {
    $CmdW = Get-Command pythonw.exe -ErrorAction SilentlyContinue
    if ($CmdW) {
        $PythonExe = $CmdW.Source
    } else {
        $Cmd = Get-Command python.exe -ErrorAction SilentlyContinue
        if ($Cmd) {
            $PythonExe = $Cmd.Source
        } else {
            Write-Error "Python executable (pythonw.exe or python.exe) was not found in client/.venv or PATH. Please run setup.ps1 first."
        }
    }
}

$IsWindowless = ($PythonExe -match 'pythonw(\.exe)?$')
$ModeLabel = if ($IsWindowless) { "Windowless background (pythonw.exe)" } else { "Console window fallback (python.exe)" }

Write-Host "[*] Client Directory : $ClientDir" -ForegroundColor Gray
Write-Host "[*] Script Path      : $ClientScript" -ForegroundColor Gray
Write-Host "[*] Python Path      : $PythonExe ($ModeLabel)" -ForegroundColor Gray

# 4. Check Administrator privileges if -AtStartup is requested
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($AtStartup -and -not $IsAdmin) {
    Write-Error "-AtStartup registers a boot-time service under SYSTEM and requires elevated Administrator privileges. Please re-run PowerShell as Administrator, or omit -AtStartup for user logon auto-start."
}

# 5. Define Task Action, Trigger, and Register Task
$TaskName = "EdgeShieldClient"
$RegisteredSuccessfully = $false

try {
    # Action program = absolute path to pythonw.exe (or python.exe)
    # Arguments = absolute path to client.py
    # WorkingDirectory / Start in = absolute client directory
    $Action = New-ScheduledTaskAction -Execute $PythonExe -Argument "`"$ClientScript`"" -WorkingDirectory $ClientDir

    if ($AtStartup) {
        Write-Host "[*] Trigger Mode     : System Boot (AtStartup - Requires Administrator)" -ForegroundColor Cyan
        $Trigger = New-ScheduledTaskTrigger -AtStartup
        $Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    } else {
        Write-Host "[*] Trigger Mode     : User Logon (AtLogOn for $env:USERNAME - No Admin Required)" -ForegroundColor Cyan
        $Trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
        $Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
    }

    # Ensure task can run on battery and does not terminate on laptops
    $Settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -RestartCount 3 `
        -RestartInterval (New-TimeSpan -Minutes 1) `
        -ExecutionTimeLimit (New-TimeSpan -Days 0)

    Write-Host "[*] Registering Scheduled Task '$TaskName' via ScheduledTask cmdlets..." -ForegroundColor Gray
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $Action `
        -Trigger $Trigger `
        -Principal $Principal `
        -Settings $Settings `
        -Description "EdgeShield PC Telemetry Client Agent (background auto-start service)" `
        -Force | Out-Null

    Start-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    $RegisteredSuccessfully = $true
} catch {
    Write-Warning "PowerShell ScheduledTask cmdlets failed ($($_.Exception.Message)). Falling back to schtasks.exe..."
    $Sc = if ($AtStartup) { "ONSTART" } else { "ONLOGON" }

    # Fallback Approach: Dedicated launcher script client/install/run_client.cmd
    # Guarantees working directory is set to $ClientDir ('cd /d') before running pythonw.exe detached.
    $LauncherScript = Join-Path $ScriptDir "run_client.cmd"
    if (-not (Test-Path $LauncherScript)) {
        $LauncherContent = @"
@echo off
cd /d "$ClientDir"
start "" "$PythonExe" "$ClientScript" %*
"@
        Set-Content -Path $LauncherScript -Value $LauncherContent -Encoding Ascii
    }

    $schArgs = @("/Create", "/TN", $TaskName, "/TR", "`"$LauncherScript`"", "/SC", $Sc, "/F")
    if ($AtStartup) {
        $schArgs += @("/RU", "SYSTEM", "/RL", "HIGHEST")
    } else {
        $schArgs += @("/RU", $env:USERNAME, "/RL", "LIMITED")
    }

    $createProcess = Start-Process -FilePath "schtasks.exe" -ArgumentList $schArgs -NoNewWindow -Wait -PassThru
    if ($createProcess.ExitCode -eq 0) {
        Start-Process -FilePath "schtasks.exe" -ArgumentList @("/Run", "/TN", $TaskName) -NoNewWindow -Wait -PassThru | Out-Null
        $RegisteredSuccessfully = $true
    } else {
        Write-Warning "schtasks.exe returned exit code $($createProcess.ExitCode). Scheduled Task could not be registered in this restricted environment."
    }
}

$LogPath = Join-Path $ClientDir "logs\client.log"
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
if ($RegisteredSuccessfully) {
    Write-Host "[+] Scheduled Task '$TaskName' successfully registered and started!" -ForegroundColor Green
    Write-Host "[i] Health Check: Confirm task is Running with 'schtasks /Query /TN `"$TaskName`"' and tail logs with 'Get-Content -Wait -Tail 30 `"$LogPath`"'." -ForegroundColor Cyan
} else {
    Write-Host "[*] Task configuration prepared for '$TaskName'." -ForegroundColor Yellow
}
Write-Host "[*] Task Name        : $TaskName" -ForegroundColor White
Write-Host "[*] Action Program   : $PythonExe" -ForegroundColor White
Write-Host "[*] Arguments        : $ClientScript" -ForegroundColor White
Write-Host "[*] Working Directory: $ClientDir" -ForegroundColor White
Write-Host "[*] Log Output File  : $LogPath" -ForegroundColor White
Write-Host ""
Write-Host "Verification Commands:" -ForegroundColor Cyan
Write-Host "  schtasks /Query /TN `"$TaskName`" /V /FO LIST" -ForegroundColor Yellow
Write-Host "  Get-ScheduledTask -TaskName `"$TaskName`"" -ForegroundColor Yellow
Write-Host ""
Write-Host "Task Management Commands:" -ForegroundColor Cyan
Write-Host "  Run task immediately : schtasks /Run /TN `"$TaskName`"" -ForegroundColor Gray
Write-Host "  Stop task             : schtasks /End /TN `"$TaskName`"" -ForegroundColor Gray
Write-Host "  Tail client logs      : Get-Content -Wait -Tail 30 `"$LogPath`"" -ForegroundColor Gray
Write-Host "  Uninstall task        : powershell -ExecutionPolicy Bypass -File `"$ScriptDir\uninstall_windows.ps1`"" -ForegroundColor Gray
Write-Host ""
Write-Host "Auto-Start Verification Checklist:" -ForegroundColor Cyan
Write-Host "  1. Run setup.ps1 -> Select 'Y' to enable auto-start Scheduled Task." -ForegroundColor White
Write-Host "  2. Close all CMD / PowerShell windows -> Verify metrics still arrive at Central Server." -ForegroundColor White
Write-Host "  3. Run: schtasks /Query /TN `"$TaskName`" /V /FO LIST" -ForegroundColor White
Write-Host "     Verify 'Task To Run' points to pythonw.exe and 'Start In' / Working Directory is '$ClientDir'." -ForegroundColor Gray
Write-Host "  4. Log off and log back in -> Verify agent runs automatically in background without a window." -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Cyan
