<#
.SYNOPSIS
    Interactive Guided Setup Wizard for the EdgeShield PC Client Agent.

.DESCRIPTION
    Prompts the user for minimal configuration (Server IP, Port, Device ID, Room),
    creates a local client/.env file, and optionally registers and starts the
    Windows Scheduled Task auto-start service.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\setup.ps1
#>
[CmdletBinding()]
param(
    [string]$ServerIp,
    [string]$ServerPort = "5000",
    [string]$DeviceId,
    [string]$Room,
    [switch]$NonInteractive
)

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "    EdgeShield PC Client - Guided Setup Wizard   " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This wizard will configure your client agent settings (.env)"
Write-Host "and optionally register auto-start on boot/logon."
Write-Host ""

# 1. Resolve paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ClientDir = (Resolve-Path (Join-Path $ScriptDir "..")).Path
$RootDir = (Resolve-Path (Join-Path $ClientDir "..")).Path
$ClientScript = Join-Path $ClientDir "client.py"
$EnvFile = Join-Path $ClientDir ".env"

if (-not (Test-Path $ClientScript)) {
    Write-Error "Could not locate client.py at $ClientScript"
}

# 2. Detect Python interpreter
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
Write-Host ""

# 3. Check for existing .env
$WriteConfig = $true
if (Test-Path $EnvFile) {
    Write-Host "[!] An existing configuration file was found at:" -ForegroundColor Yellow
    Write-Host "    $EnvFile" -ForegroundColor Yellow

    if (-not $NonInteractive) {
        $Overwrite = Read-Host "[?] Overwrite existing .env configuration? (y/N)"
        if ($Overwrite -match '^[Yy]$') {
            $Timestamp = Get-Date -Format "yyyyMMddHHmmss"
            $BackupFile = "$EnvFile.bak.$Timestamp"
            Copy-Item $EnvFile $BackupFile
            Write-Host "[*] Existing configuration backed up to $(Split-Path $BackupFile -Leaf)" -ForegroundColor Gray
        } else {
            $WriteConfig = $false
            Write-Host "[*] Keeping existing .env configuration." -ForegroundColor Gray
        }
        Write-Host ""
    }
}

# 4. Interactive Prompts
if ($WriteConfig) {
    # Prompt: SERVER_IP (Required)
    if (-not $ServerIp) {
        while (-not $ServerIp) {
            $InputIp = Read-Host "Enter Central Server IP or Hostname [Required]"
            $ServerIp = $InputIp.Trim()
            if (-not $ServerIp) {
                Write-Host "[!] Server IP cannot be empty. Please enter a valid IP address or hostname." -ForegroundColor Red
            }
        }
    }

    # Prompt: SERVER_PORT (Default: 5000)
    if (-not $NonInteractive -and $ServerPort -eq "5000") {
        $InputPort = Read-Host "Enter Central Server Port [5000]"
        if ($InputPort.Trim()) {
            $ServerPort = $InputPort.Trim()
        }
    }

    # Prompt: DEVICE_ID (Optional)
    if (-not $DeviceId -and -not $NonInteractive) {
        $InputDevice = Read-Host "Enter Device Identifier (leave blank for PC-<hostname>)"
        $DeviceId = $InputDevice.Trim()
    }

    # Prompt: ROOM (Optional)
    if (-not $Room -and -not $NonInteractive) {
        $InputRoom = Read-Host "Enter Room / Location Tag (e.g. Lab-A, Office-204) [Optional]"
        $Room = $InputRoom.Trim()
    }

    # Advanced options prompt
    $SamplingInterval = 10
    $FlushInterval = 60
    $FlushMax = 20
    $SpoolMax = 5000

    if (-not $NonInteractive) {
        Write-Host ""
        $Advanced = Read-Host "Configure advanced timing/spool parameters? (y/N)"
        if ($Advanced -match '^[Yy]$') {
            $InputSampling = Read-Host "  Sampling interval in seconds [10]"
            if ($InputSampling.Trim()) { $SamplingInterval = [int]$InputSampling.Trim() }

            $InputFlush = Read-Host "  Flush interval in seconds [60]"
            if ($InputFlush.Trim()) { $FlushInterval = [int]$InputFlush.Trim() }

            $InputFlushMax = Read-Host "  Max batch records per flush [20]"
            if ($InputFlushMax.Trim()) { $FlushMax = [int]$InputFlushMax.Trim() }

            $InputSpoolMax = Read-Host "  Max local spool retention records [5000]"
            if ($InputSpoolMax.Trim()) { $SpoolMax = [int]$InputSpoolMax.Trim() }
        }
    }

    # Build .env content
    $EnvContent = @()
    $EnvContent += "# EdgeShield Client Configuration (Generated by setup.ps1)"
    $EnvContent += "SERVER_IP=$ServerIp"
    $EnvContent += "SERVER_PORT=$ServerPort"
    $EnvContent += "SERVER_ENDPOINT=/metrics"

    if ($DeviceId) {
        $EnvContent += "DEVICE_ID=$DeviceId"
    } else {
        $EnvContent += "# DEVICE_ID= (default: PC-<hostname>)"
    }

    if ($Room) {
        $EnvContent += "ROOM=$Room"
    } else {
        $EnvContent += "# ROOM= (default: unassigned)"
    }

    $EnvContent += "SAMPLING_INTERVAL_SECONDS=$SamplingInterval"
    $EnvContent += ""
    $EnvContent += "# Durable Spool & Batching Settings"
    $EnvContent += "FLUSH_INTERVAL_SECONDS=$FlushInterval"
    $EnvContent += "FLUSH_MAX_RECORDS=$FlushMax"
    $EnvContent += "SPOOL_MAX_RECORDS=$SpoolMax"
    $EnvContent += "SPOOL_DIR=./spool"
    $EnvContent += ""
    $EnvContent += "# File Logging Settings"
    $EnvContent += "LOG_DIR=./logs"
    $EnvContent += "LOG_FILE=./logs/client.log"

    $EnvContent | Out-File -FilePath $EnvFile -Encoding utf8
    Write-Host "[+] Configuration written successfully to $EnvFile" -ForegroundColor Green
    Write-Host ""
}

# 5. Prompt: Auto-start on boot / logon
$BootEnabled = $false
if (-not $NonInteractive) {
    $EnableBoot = Read-Host "Enable automatic start on boot/logon (Scheduled Task)? (Y/n)"
    if ($EnableBoot -notmatch '^[Nn]$') {
        Write-Host "[*] Launching Windows Task Installer..." -ForegroundColor Cyan
        & "$ScriptDir\install_windows.ps1"
        $BootEnabled = $true
    } else {
        # 6. Prompt: Start client now (if auto-start was skipped)
        $StartNow = Read-Host "Start the client agent now in the background? (Y/n)"
        if ($StartNow -notmatch '^[Nn]$') {
            Write-Host "[*] Launching client agent in background..." -ForegroundColor Cyan
            Start-Process -FilePath $PythonExe -ArgumentList "`"$ClientScript`"" -WorkingDirectory $ClientDir -WindowStyle Hidden
            Write-Host "[+] Client agent started in background." -ForegroundColor Green
        }
    }
}

$LogFile = Join-Path $ClientDir "logs\client.log"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "         EdgeShield Client Setup Complete!        " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "[*] Configuration file : $EnvFile" -ForegroundColor Gray
Write-Host "[*] Log output file    : $LogFile" -ForegroundColor Gray
Write-Host "[*] Live log streaming : Get-Content -Wait -Tail 30 '$LogFile'" -ForegroundColor Yellow
if ($BootEnabled) {
    Write-Host "[*] Task query command : Get-ScheduledTask -TaskName 'EdgeShieldClient'" -ForegroundColor Gray
    Write-Host "[*] Uninstall task     : powershell -ExecutionPolicy Bypass -File '$ScriptDir\uninstall_windows.ps1'" -ForegroundColor Gray
} else {
    Write-Host "[*] Manual run command : python client.py" -ForegroundColor Gray
    Write-Host "[*] Enable task later  : powershell -ExecutionPolicy Bypass -File '$ScriptDir\install_windows.ps1'" -ForegroundColor Gray
}
Write-Host "==================================================" -ForegroundColor Cyan
