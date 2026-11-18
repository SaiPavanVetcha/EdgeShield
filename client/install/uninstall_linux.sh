#!/usr/bin/env bash
# ==============================================================================
# EdgeShield Client - Linux systemd Service Uninstaller
# ==============================================================================
set -euo pipefail

echo "=================================================="
echo " EdgeShield PC Client - Linux Service Uninstaller"
echo "=================================================="

# 1. Stop and disable user service if present
USER_SERVICE="$HOME/.config/systemd/user/edgeshield-client.service"
if [ -f "$USER_SERVICE" ]; then
    echo "[*] Stopping and disabling user service..."
    systemctl --user stop edgeshield-client.service 2>/dev/null || true
    systemctl --user disable edgeshield-client.service 2>/dev/null || true
    rm -f "$USER_SERVICE"
    systemctl --user daemon-reload 2>/dev/null || true
    echo "[+] Removed user service: $USER_SERVICE"
fi

# 2. Stop and disable system service if running as root
SYSTEM_SERVICE="/etc/systemd/system/edgeshield-client.service"
if [ -f "$SYSTEM_SERVICE" ]; then
    if [ "${EUID}" -eq 0 ]; then
        echo "[*] Stopping and disabling system service..."
        systemctl stop edgeshield-client.service 2>/dev/null || true
        systemctl disable edgeshield-client.service 2>/dev/null || true
        rm -f "$SYSTEM_SERVICE"
        systemctl daemon-reload 2>/dev/null || true
        echo "[+] Removed system service: $SYSTEM_SERVICE"
    else
        echo "[!] Notice: A system-wide unit exists at $SYSTEM_SERVICE."
        echo "    To remove it, please run: sudo ./uninstall_linux.sh"
    fi
fi

echo ""
echo "[+] EdgeShield PC Client service successfully uninstalled."
echo "=================================================="
