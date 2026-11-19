#!/usr/bin/env bash
# ==============================================================================
# EdgeShield Client - Guided Interactive Setup (Linux/macOS)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$CLIENT_DIR/.env"
VENV_DIR="$CLIENT_DIR/.venv"
REQ_FILE="$CLIENT_DIR/requirements.txt"

echo "=================================================="
echo "    EdgeShield PC Client - Guided Setup Wizard   "
echo "=================================================="
echo ""
echo "This wizard configures your client environment, installs dependencies"
echo "into a dedicated virtual environment (.venv), writes client/.env,"
echo "and optionally registers the auto-start service."
echo ""

# 1. Resolve System Python (Python 3.11+ required)
echo "[*] Detecting system Python 3.11+..."
SYSTEM_PYTHON=""
for py_cmd in python3.13 python3.12 python3.11 python3 python; do
    if command -v "$py_cmd" &>/dev/null; then
        if "$py_cmd" -c "import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)" 2>/dev/null; then
            SYSTEM_PYTHON="$(command -v "$py_cmd")"
            break
        fi
    fi
done

if [ -z "$SYSTEM_PYTHON" ]; then
    echo "[!] Error: Python 3.11+ is required but was not found in PATH." >&2
    echo "    Please install Python 3.11 or newer and re-run this setup wizard." >&2
    exit 1
fi

PY_VERSION="$("$SYSTEM_PYTHON" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')")"
echo "[+] Located Python interpreter: $SYSTEM_PYTHON (v$PY_VERSION)"
echo "[*] Client Directory          : $CLIENT_DIR"
echo ""

# 2. Create client/.venv if it does not exist
if [ ! -d "$VENV_DIR" ]; then
    echo "[*] Creating dedicated virtual environment at $VENV_DIR..."
    "$SYSTEM_PYTHON" -m venv "$VENV_DIR"
    echo "[+] Virtual environment created successfully."
else
    echo "[*] Using existing virtual environment at $VENV_DIR."
fi

# Locate python and pip inside .venv
VENV_PYTHON=""
if [ -x "$VENV_DIR/bin/python3" ]; then
    VENV_PYTHON="$VENV_DIR/bin/python3"
elif [ -x "$VENV_DIR/bin/python" ]; then
    VENV_PYTHON="$VENV_DIR/bin/python"
elif [ -x "$VENV_DIR/Scripts/python.exe" ]; then
    VENV_PYTHON="$VENV_DIR/Scripts/python.exe"
else
    VENV_PYTHON="$VENV_DIR/bin/python"
fi

# 3. Install client dependencies into .venv
if [ -f "$REQ_FILE" ]; then
    echo "[*] Installing client dependencies into .venv from requirements.txt..."
    set +e
    "$VENV_PYTHON" -m pip install --quiet --upgrade pip 2>/dev/null
    "$VENV_PYTHON" -m pip install -r "$REQ_FILE"
    PIP_STATUS=$?
    set -e
    if [ $PIP_STATUS -eq 0 ]; then
        echo "[+] Dependencies installed successfully."
    else
        echo "[!] Warning: pip install exited with code $PIP_STATUS. If offline or in a restricted network, install dependencies when connected via: $VENV_PYTHON -m pip install -r $REQ_FILE"
    fi
else
    echo "[!] Warning: $REQ_FILE not found. Skipping dependency installation."
fi
echo ""

# 4. Check for existing .env configuration
WRITE_CONFIG=true
if [ -f "$ENV_FILE" ]; then
    echo "[!] An existing configuration file was found at:"
    echo "    $ENV_FILE"
    read -r -p "[?] Overwrite existing .env configuration? [y/N]: " OVERWRITE
    if [[ "$OVERWRITE" =~ ^[Yy]$ ]]; then
        BACKUP_FILE="$CLIENT_DIR/.env.bak.$(date +%Y%m%d%H%M%S)"
        cp "$ENV_FILE" "$BACKUP_FILE"
        echo "[*] Existing configuration backed up to $(basename "$BACKUP_FILE")"
    else
        WRITE_CONFIG=false
        echo "[*] Keeping existing .env configuration."
    fi
    echo ""
fi

# 5. Interactive Configuration Prompts
if [ "$WRITE_CONFIG" = true ]; then
    # Prompt: SERVER_IP (Required)
    SERVER_IP=""
    while [ -z "$SERVER_IP" ]; do
        read -r -p "Enter Central Server IP or Hostname [Required]: " SERVER_IP
        SERVER_IP="$(echo "$SERVER_IP" | xargs)"
        if [ -z "$SERVER_IP" ]; then
            echo "[!] Server IP cannot be empty. Please enter a valid IP address or hostname."
        fi
    done

    # Prompt: SERVER_PORT (Default: 5000)
    read -r -p "Enter Central Server Port [5000]: " SERVER_PORT
    SERVER_PORT="$(echo "$SERVER_PORT" | xargs)"
    SERVER_PORT="${SERVER_PORT:-5000}"

    # Prompt: DEVICE_ID (Optional)
    read -r -p "Enter Device Identifier (leave blank for PC-<hostname>): " DEVICE_ID
    DEVICE_ID="$(echo "$DEVICE_ID" | xargs)"

    # Prompt: ROOM (Optional)
    read -r -p "Enter Room / Location Tag (e.g. Lab-A, Office-204) [Optional]: " ROOM
    ROOM="$(echo "$ROOM" | xargs)"

    # Advanced options prompt
    echo ""
    read -r -p "Configure advanced timing/spool parameters? [y/N]: " ADVANCED
    SAMPLING_INTERVAL=10
    FLUSH_INTERVAL=60
    FLUSH_MAX=20
    SPOOL_MAX=5000

    if [[ "$ADVANCED" =~ ^[Yy]$ ]]; then
        read -r -p "  Sampling interval in seconds [10]: " USER_SAMPLING
        SAMPLING_INTERVAL="$(echo "$USER_SAMPLING" | xargs)"
        SAMPLING_INTERVAL="${SAMPLING_INTERVAL:-10}"

        read -r -p "  Flush interval in seconds [60]: " USER_FLUSH
        FLUSH_INTERVAL="$(echo "$USER_FLUSH" | xargs)"
        FLUSH_INTERVAL="${FLUSH_INTERVAL:-60}"

        read -r -p "  Max batch records per flush [20]: " USER_FLUSH_MAX
        FLUSH_MAX="$(echo "$USER_FLUSH_MAX" | xargs)"
        FLUSH_MAX="${FLUSH_MAX:-20}"

        read -r -p "  Max local spool retention records [5000]: " USER_SPOOL_MAX
        SPOOL_MAX="$(echo "$USER_SPOOL_MAX" | xargs)"
        SPOOL_MAX="${SPOOL_MAX:-5000}"
    fi

    # Write .env configuration file
    cat > "$ENV_FILE" <<EOF
# EdgeShield Client Configuration (Generated by setup.sh)
SERVER_IP=$SERVER_IP
SERVER_PORT=$SERVER_PORT
SERVER_ENDPOINT=/metrics
EOF

    if [ -n "$DEVICE_ID" ]; then
        echo "DEVICE_ID=$DEVICE_ID" >> "$ENV_FILE"
    else
        echo "# DEVICE_ID= (default: PC-<hostname>)" >> "$ENV_FILE"
    fi

    if [ -n "$ROOM" ]; then
        echo "ROOM=$ROOM" >> "$ENV_FILE"
    else
        echo "# ROOM= (default: unassigned)" >> "$ENV_FILE"
    fi

    cat >> "$ENV_FILE" <<EOF
SAMPLING_INTERVAL_SECONDS=$SAMPLING_INTERVAL

# Durable Spool & Batching Settings
FLUSH_INTERVAL_SECONDS=$FLUSH_INTERVAL
FLUSH_MAX_RECORDS=$FLUSH_MAX
SPOOL_MAX_RECORDS=$SPOOL_MAX
SPOOL_DIR=./spool

# File Logging Settings
LOG_DIR=./logs
LOG_FILE=./logs/client.log
EOF

    echo "[+] Configuration written successfully to $ENV_FILE"
    echo ""
fi

# 6. Prompt: Auto-start on boot
read -r -p "Enable automatic start on boot (systemd service)? [Y/n]: " ENABLE_BOOT
ENABLE_BOOT="$(echo "$ENABLE_BOOT" | xargs)"
ENABLE_BOOT="${ENABLE_BOOT:-Y}"

BOOT_ENABLED=false
if [[ "$ENABLE_BOOT" =~ ^[Yy]$ ]]; then
    echo "[*] Launching systemd service installer..."
    bash "$SCRIPT_DIR/install_linux.sh"
    BOOT_ENABLED=true
else
    # 7. Prompt: Start client now (if auto-start was skipped)
    read -r -p "Start the client agent now in the background? [Y/n]: " START_NOW
    START_NOW="$(echo "$START_NOW" | xargs)"
    START_NOW="${START_NOW:-Y}"

    if [[ "$START_NOW" =~ ^[Yy]$ ]]; then
        echo "[*] Starting client agent in background using .venv Python..."
        cd "$CLIENT_DIR"
        nohup "$VENV_PYTHON" "$CLIENT_DIR/client.py" >/dev/null 2>&1 &
        CLIENT_PID=$!
        echo "[+] Client agent started successfully (PID: $CLIENT_PID)."
    fi
fi

# 8. Summary and next steps
echo ""
echo "=================================================="
echo "         EdgeShield Client Setup Complete!        "
echo "=================================================="
echo "[*] Virtual environment: $VENV_DIR"
echo "[*] Python executable  : $VENV_PYTHON"
echo "[*] Configuration file : $ENV_FILE"
echo "[*] Log output file    : $CLIENT_DIR/logs/client.log"
echo "[*] Live log streaming : tail -f $CLIENT_DIR/logs/client.log"
if [ "$BOOT_ENABLED" = true ]; then
    echo "[*] Service status     : systemctl --user status edgeshield-client.service"
    echo "[*] Uninstall service  : bash $SCRIPT_DIR/uninstall_linux.sh"
else
    echo "[*] Manual run command : $VENV_PYTHON $CLIENT_DIR/client.py"
    echo "[*] Enable boot later  : bash $SCRIPT_DIR/install_linux.sh"
fi
echo "=================================================="
