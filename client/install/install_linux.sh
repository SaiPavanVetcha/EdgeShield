#!/usr/bin/env bash
# ==============================================================================
# EdgeShield Client - Linux systemd Service Installer
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE_FILE="$SCRIPT_DIR/edgeshield-client.service"

echo "=================================================="
echo " EdgeShield PC Client - Linux Service Installer"
echo "=================================================="

# 1. Resolve Python executable (prioritize dedicated .venv)
PYTHON_PATH=""
if [ -x "$CLIENT_DIR/.venv/bin/python3" ]; then
    PYTHON_PATH="$CLIENT_DIR/.venv/bin/python3"
elif [ -x "$CLIENT_DIR/.venv/bin/python" ]; then
    PYTHON_PATH="$CLIENT_DIR/.venv/bin/python"
elif [ -x "$CLIENT_DIR/venv/bin/python3" ]; then
    PYTHON_PATH="$CLIENT_DIR/venv/bin/python3"
elif [ -x "$CLIENT_DIR/venv/bin/python" ]; then
    PYTHON_PATH="$CLIENT_DIR/venv/bin/python"
elif command -v python3 &>/dev/null; then
    PYTHON_PATH="$(command -v python3)"
elif command -v python &>/dev/null; then
    PYTHON_PATH="$(command -v python)"
else
    echo "[!] Error: No Python executable found. Please run setup.sh first." >&2
    exit 1
fi

echo "[*] Client Directory : $CLIENT_DIR"
echo "[*] Python Path      : $PYTHON_PATH"

# 2. Check for configuration file (.env)
if [ ! -f "$CLIENT_DIR/.env" ]; then
    echo "[!] Warning: $CLIENT_DIR/.env not found."
    if [ -f "$CLIENT_DIR/.env.example" ]; then
        echo "    Copying .env.example to .env..."
        cp "$CLIENT_DIR/.env.example" "$CLIENT_DIR/.env"
        echo "    Please edit $CLIENT_DIR/.env with your SERVER_IP, DEVICE_ID, and ROOM."
    fi
fi

# 3. Determine installation target (User vs System)
USE_SYSTEM=false
if [ "${1:-}" = "--system" ] || [ "${EUID}" -eq 0 ]; then
    USE_SYSTEM=true
fi

if [ "$USE_SYSTEM" = true ]; then
    if [ "${EUID}" -ne 0 ]; then
        echo "[!] Error: System-wide installation (/etc/systemd/system) requires root privileges (sudo)." >&2
        exit 1
    fi
    SERVICE_DEST_DIR="/etc/systemd/system"
    SERVICE_FILE="$SERVICE_DEST_DIR/edgeshield-client.service"
    WANTED_BY="multi-user.target"
    SYSTEMCTL_CMD="systemctl"
    echo "[*] Install Mode     : System-wide (/etc/systemd/system)"
else
    SERVICE_DEST_DIR="$HOME/.config/systemd/user"
    SERVICE_FILE="$SERVICE_DEST_DIR/edgeshield-client.service"
    WANTED_BY="default.target"
    SYSTEMCTL_CMD="systemctl --user"
    mkdir -p "$SERVICE_DEST_DIR"
    echo "[*] Install Mode     : User service (no root required)"
fi

# 4. Generate systemd unit from template
echo "[*] Generating systemd unit file at $SERVICE_FILE..."
sed \
    -e "s|{{CLIENT_DIR}}|$CLIENT_DIR|g" \
    -e "s|{{PYTHON_PATH}}|$PYTHON_PATH|g" \
    -e "s|{{WANTED_BY}}|$WANTED_BY|g" \
    "$TEMPLATE_FILE" > "$SERVICE_FILE"

# 5. Reload, enable, and start service
echo "[*] Reloading systemd daemon..."
$SYSTEMCTL_CMD daemon-reload

echo "[*] Enabling and starting edgeshield-client.service..."
$SYSTEMCTL_CMD enable --now edgeshield-client.service

# 6. Enable lingering if user service so it persists across logouts and reboots
if [ "$USE_SYSTEM" = false ]; then
    if command -v loginctl &>/dev/null; then
        echo "[*] Enabling linger for $USER (ensures service runs across system reboots)..."
        loginctl enable-linger "$USER" 2>/dev/null || true
    fi
fi

echo ""
echo "[+] EdgeShield PC Client successfully installed and started!"
echo "[*] Service status : $SYSTEMCTL_CMD status edgeshield-client.service"
echo "[*] Follow logs    : tail -f $CLIENT_DIR/logs/client.log"
echo "[*] Journal logs   : $SYSTEMCTL_CMD -u edgeshield-client.service -f"
echo "=================================================="
