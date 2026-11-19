<#
.SYNOPSIS
    Interactive Guided Setup Wizard for the EdgeShield PC Client Agent.

.DESCRIPTION
    1. Locates system Python 3.11+.
    2. Creates a dedicated virtual environment (.venv) if not already present.
    3. Installs client dependencies from requirements.txt into the virtual environment.
    4. Prompts for configuration (Server IP, Port, Device ID, Room) and generates client/.env.
    5. Optionally registers the client as an auto-start Scheduled Task or launches it in the background.

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
Write-Host "This wizard configures your client environment, installs dependencies"
Write-Host "into a dedicated virtual environment (.venv), writes client/.env,"
Write-Host "and optionally registers auto-start on boot/logon."
Write-Host ""

# 1. Resolve paths (self-contained within client folder; no repo root assumption)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ClientDir = (Resolve-Path (Join-Path $ScriptDir "..")).Path
$ClientScript = Join-Path $ClientDir "client.py"
$EnvFile = Join-Path $ClientDir ".env"
$VenvDir = Join-Path $ClientDir ".venv"
$ReqFile = Join-Path $ClientDir "requirements.txt"

if (-not (Test-Path $ClientScript)) {
    Write-Error "Could not locate client.py at $ClientScript"
}

# 2. Find system Python 3.11+
Write-Host "[*] Detecting system Python 3.11+..." -ForegroundColor Cyan
$SystemPython = $null
$PyCommands = @("py.exe", "python.exe", "python3.exe")

foreach ($cmdName in $PyCommands) {
    $cmd = Get-Command $cmdName -ErrorAction SilentlyContinue
    if ($cmd) {
        $testCode = "import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)"
        & $cmd.Source -c $testCode 2>$null
        if ($LASTEXITCODE -eq 0) {
            $SystemPython = $cmd.Source
            break
        }
    }
}

if (-not $SystemPython) {
    # If standard PATH commands failed, test py launcher with specific 3.11/3.12 flags
    $pyLauncher = Get-Command "py.exe" -ErrorAction SilentlyContinue
    if ($pyLauncher) {
        $pyArgs = @("-3.12", "-3.11", "-3")
        foreach ($flag in $pyArgs) {
            & $pyLauncher.Source $flag -c "import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)" 2>$null
            if ($LASTEXITCODE -eq 0) {
                $SystemPython = "$($pyLauncher.Source) $flag"
                break
            }
        }
    }
}

if (-not $SystemPython) {
    Write-Error "Python 3.11+ is required but was not found in PATH. Please install Python 3.11 or newer."
}

Write-Host "[+] Located Python interpreter: $SystemPython" -ForegroundColor Green
Write-Host "[*] Client Directory          : $ClientDir" -ForegroundColor Gray
Write-Host ""

# 3. Create client/.venv if it does not exist
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    Write-Host "[*] Creating dedicated virtual environment at $VenvDir..." -ForegroundColor Cyan
    if ($SystemPython -match '^(.+\.exe)\s+(-\d.*)$') {
        $baseExe = $Matches[1]
        $extraArg = $Matches[2]
        & $baseExe $extraArg -m venv $VenvDir
    } else {
        & $SystemPython -m venv $VenvDir
    }

    if (-not (Test-Path $VenvPython)) {
        Write-Error "Failed to create virtual environment at $VenvDir"
    }
    Write-Host "[+] Virtual environment created successfully." -ForegroundColor Green
} else {
    Write-Host "[*] Using existing virtual environment at $VenvDir." -ForegroundColor Gray
}

# 4. Install dependencies into .venv
if (Test-Path $ReqFile) {
    Write-Host "[*] Installing client dependencies into .venv from requirements.txt..." -ForegroundColor Cyan
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & $VenvPython -m pip install --upgrade pip 2>&1 | Out-Null
        & $VenvPython -m pip install -r $ReqFile
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[+] Dependencies installed successfully." -ForegroundColor Green
        } else {
            Write-Warning "pip install exited with code $LASTEXITCODE. If offline or in a restricted network, install dependencies when connected via: & '$VenvPython' -m pip install -r '$ReqFile'"
        }
    } catch {
        Write-Warning "Could not complete pip install: $($_.Exception.Message)"
    } finally {
        $ErrorActionPreference = $prevEAP
    }
} else {
    Write-Warning "requirements.txt not found at $ReqFile. Skipping dependency installation."
}
Write-Host ""

# 5. Check for existing .env configuration
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

# 6. Interactive Configuration Prompts
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

# 7. Prompt: Auto-start on boot / logon
$BootEnabled = $false
if (-not $NonInteractive) {
    $EnableBoot = Read-Host "Enable automatic start on boot/logon (Scheduled Task)? (Y/n)"
    if ($EnableBoot -notmatch '^[Nn]$') {
        Write-Host "[*] Launching Windows Task Installer..." -ForegroundColor Cyan
        & "$ScriptDir\install_windows.ps1"
        $BootEnabled = $true
    } else {
        # 8. Prompt: Start client now (if auto-start was skipped)
        $StartNow = Read-Host "Start the client agent now in the background? (Y/n)"
        if ($StartNow -notmatch '^[Nn]$') {
            Write-Host "[*] Launching client agent in background using .venv Python..." -ForegroundColor Cyan
            Start-Process -FilePath $VenvPython -ArgumentList "`"$ClientScript`"" -WorkingDirectory $ClientDir -WindowStyle Hidden
            Write-Host "[+] Client agent started in background." -ForegroundColor Green
        }
    }
}

$LogFile = Join-Path $ClientDir "logs\client.log"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "         EdgeShield Client Setup Complete!        " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "[*] Virtual environment: $VenvDir" -ForegroundColor Gray
Write-Host "[*] Python executable  : $VenvPython" -ForegroundColor Gray
Write-Host "[*] Configuration file : $EnvFile" -ForegroundColor Gray
Write-Host "[*] Log output file    : $LogFile" -ForegroundColor Gray
Write-Host "[*] Live log streaming : Get-Content -Wait -Tail 30 '$LogFile'" -ForegroundColor Yellow
if ($BootEnabled) {
    Write-Host "[*] Task query command : Get-ScheduledTask -TaskName 'EdgeShieldClient'" -ForegroundColor Gray
    Write-Host "[*] Uninstall task     : powershell -ExecutionPolicy Bypass -File '$ScriptDir\uninstall_windows.ps1'" -ForegroundColor Gray
} else {
    Write-Host "[*] Manual run command : & '$VenvPython' client.py" -ForegroundColor Gray
    Write-Host "[*] Enable task later  : powershell -ExecutionPolicy Bypass -File '$ScriptDir\install_windows.ps1'" -ForegroundColor Gray
}
Write-Host "==================================================" -ForegroundColor Cyan
