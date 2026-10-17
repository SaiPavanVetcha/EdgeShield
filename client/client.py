import socket
import time
from datetime import datetime, timezone
import requests

from config import DEVICE_ID, SAMPLING_INTERVAL, SERVER_URL
from collectors import (
    collect_battery_metrics,
    collect_cpu_metrics,
    collect_disk_metrics,
    collect_ram_metrics,
    collect_system_info,
)


def build_telemetry_payload() -> dict:
    """Aggregates all collector module outputs into a single JSON payload."""
    return {
        "device_id": DEVICE_ID,
        "hostname": socket.gethostname(),
        "type": "pc_telemetry",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "metrics": {
            "system": collect_system_info(),
            "cpu": collect_cpu_metrics(),
            "ram": collect_ram_metrics(),
            "disk": collect_disk_metrics(),
            "battery": collect_battery_metrics(),
        },
    }


def send_telemetry_payload() -> None:
    """Posts telemetry data over HTTP."""
    payload = build_telemetry_payload()
    try:
        response = requests.post(SERVER_URL, json=payload, timeout=3)
        response.raise_for_status()
        print(f"[{payload['timestamp']}] Telemetry transmitted successfully (HTTP {response.status_code})")
    except requests.exceptions.Timeout:
        print(f"[!] Timeout: Server unreachable at {SERVER_URL}")
    except requests.exceptions.ConnectionError:
        print(f"[!] Connection Refused: Server offline at {SERVER_URL}")
    except requests.exceptions.RequestException as err:
        print(f"[!] Transmission Error: {err}")


def main():
    print("[*] Modular EdgeShield Client Agent Initialized")
    print(f"[*] Target Endpoint : {SERVER_URL}")
    print(f"[*] Device Identity : {DEVICE_ID}")
    print(f"[*] Cadence         : Every {SAMPLING_INTERVAL}s\n")

    while True:
        cycle_start = time.time()
        send_telemetry_payload()

        elapsed = time.time() - cycle_start
        time.sleep(max(0.0, SAMPLING_INTERVAL - elapsed))


if __name__ == "__main__":
    main()