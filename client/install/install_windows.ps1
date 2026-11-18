<#
.SYNOPSIS
    Registers the EdgeShield PC Client Agent as a Windows Scheduled Task.

.DESCRIPTION
    By default, registers a task to trigger "At log on" for the current user (no administrator
    rights required in most standard environments).
    If invoked with -AtStartup, registers to run at system boot (requires Administrator privileges).

.PARAMETER AtStartup
    Registers the task to trigger at system boot instead of user logon (requires Admin).

.EXAMPLE
    .\install_windows.ps1
    # Registers task to run at logon for current user

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

# 1. Resolve paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ClientDir = (Resolve-Path (Join-Path $ScriptDir "..")).Path
$RootDir = (Resolve-Path (Join-Path $ClientDir "..")).Path
$ClientScript = Join-Path $ClientDir "client.py"

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

# 3. Detect Python interpreter (prefer virtual environments if present)
$PythonCandidates = @(
    (Join-Path $ClientDir ".venv\Scripts\python.exe"),
    (Join-Path $ClientDir "venv\Scripts\python.exe"),
    (Join-Path $RootDir ".venv\Scripts\python.exe"),
    (Join-Path $RootDir "venv\Scripts\python.exe")
)

$PythonExe = $null
foreach ($Candidate in $PythonCandidates) {
    if (Test-Path $Candidate) {
        $PythonExe = $Candidate
        break
    }
}

if (-not $PythonExe) {
    $Cmd = Get-Command python.exe -ErrorAction SilentlyContinue
    if ($Cmd) {
        $PythonExe = $Cmd.Source
    } else {
        Write-Error "python.exe was not found in PATH or virtual environments. Please install Python 3.11+."
    }
}

Write-Host "[*] Client Directory : $ClientDir" -ForegroundColor Gray
Write-Host "[*] Python Path      : $PythonExe" -ForegroundColor Gray

# 4. Check Administrator privileges if -AtStartup is requested
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($AtStartup -and -not $IsAdmin) {
    Write-Error "-AtStartup requires elevated Administrator privileges. Please re-run PowerShell as Administrator or run without -AtStartup."
}

# 5. Define Task Action, Trigger, and Register Task
$TaskName = "EdgeShieldClient"
$RegisteredSuccessfully = $false

try {
    $Action = New-ScheduledTaskAction -Execute $PythonExe -Argument "`"$ClientScript`"" -WorkingDirectory $ClientDir

    if ($AtStartup) {
        Write-Host "[*] Trigger Mode     : System Boot (AtStartup)" -ForegroundColor Cyan
        $Trigger = New-ScheduledTaskTrigger -AtStartup
        $Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    } else {
        Write-Host "[*] Trigger Mode     : User Logon (AtLogOn for $env:USERNAME)" -ForegroundColor Cyan
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
        -Description "EdgeShield PC Telemetry Client Agent (auto-start service)" `
        -Force | Out-Null

    Start-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    $RegisteredSuccessfully = $true
} catch {
    Write-Warning "PowerShell ScheduledTask cmdlets failed ($($_.Exception.Message)). Falling back to schtasks.exe..."
    $Sc = if ($AtStartup) { "ONSTART" } else { "ONLOGON" }
    $TrCommand = "\`"$PythonExe\`" \`"$ClientScript\`""

    $createProcess = Start-Process -FilePath "schtasks.exe" -ArgumentList @("/Create", "/TN", $TaskName, "/TR", $TrCommand, "/SC", $Sc, "/F") -NoNewWindow -Wait -PassThru
    if ($createProcess.ExitCode -eq 0) {
        Start-Process -FilePath "schtasks.exe" -ArgumentList @("/Run", "/TN", $TaskName) -NoNewWindow -Wait -PassThru | Out-Null
        $RegisteredSuccessfully = $true
    } else {
        Write-Warning "schtasks.exe returned exit code $($createProcess.ExitCode). Scheduled Task could not be registered in this restricted environment."
    }
}

$LogPath = Join-Path $ClientDir "logs\client.log"
Write-Host ""
if ($RegisteredSuccessfully) {
    Write-Host "[+] Scheduled Task '$TaskName' successfully registered and started!" -ForegroundColor Green
} else {
    Write-Host "[*] Setup complete. On a live host, run in normal PowerShell to register '$TaskName'." -ForegroundColor Yellow
}
Write-Host "[*] Query Status : Get-ScheduledTask -TaskName '$TaskName'  (or schtasks /Query /TN '$TaskName')" -ForegroundColor Cyan
Write-Host "[*] Output Logs  : Get-Content -Wait -Tail 30 '$LogPath'" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
