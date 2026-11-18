import socket
import time
from datetime import datetime, timezone
from typing import Tuple
import requests

from config import (
    DEVICE_ID,
    FLUSH_INTERVAL_SECONDS,
    FLUSH_MAX_RECORDS,
    ROOM,
    SAMPLING_INTERVAL,
    SERVER_URL,
    SPOOL_MAX_RECORDS,
)
from collectors import (
    collect_battery_metrics,
    collect_cpu_metrics,
    collect_disk_metrics,
    collect_ram_metrics,
    collect_system_info,
)
from spool import count, delete_ids, enqueue, fetch_batch


def build_telemetry_payload() -> dict:
    """Aggregates all collector module outputs into a single JSON payload."""
    return {
        "device_id": DEVICE_ID,
        "hostname": socket.gethostname(),
        "room": ROOM,
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


def send_payload(payload: dict) -> bool:
    """
    Transmits a single telemetry payload over HTTP to the ingestion server.
    Returns True if successfully received (HTTP 2xx), False otherwise.
    """
    try:
        response = requests.post(SERVER_URL, json=payload, timeout=3)
        response.raise_for_status()
        return True
    except requests.exceptions.Timeout:
        print(f"[!] Timeout: Server unreachable at {SERVER_URL}")
        return False
    except requests.exceptions.ConnectionError:
        print(f"[!] Connection Refused: Server offline at {SERVER_URL}")
        return False
    except requests.exceptions.RequestException as err:
        print(f"[!] Transmission Error: {err}")
        return False


def flush_spool() -> Tuple[int, int]:
    """
    Drains pending records from the local durable spool and POSTs them to the server.
    Sends one record per HTTP request to ensure backward compatibility with the ingestion server.
    Aborts immediately on the first network failure to preserve remaining spool records.
    Returns (sent_count, failed_count).
    """
    total_sent = 0
    total_failed = 0

    while True:
        batch = fetch_batch(limit=FLUSH_MAX_RECORDS)
        if not batch:
            break

        batch_aborted = False
        for record_id, payload in batch:
            if send_payload(payload):
                delete_ids([record_id])
                total_sent += 1
            else:
                total_failed += 1
                batch_aborted = True
                break

        if batch_aborted:
            break

    remaining = count()
    timestamp = datetime.now(timezone.utc).isoformat()
    if total_sent > 0 or total_failed > 0:
        print(f"[{timestamp}] Spool flush: {total_sent} sent, {total_failed} failed (pending: {remaining})")

    return total_sent, total_failed


def main():
    print("[*] Modular EdgeShield Client Agent Initialized (Durable Spool Mode)")
    print(f"[*] Target Endpoint       : {SERVER_URL}")
    print(f"[*] Device Identity       : {DEVICE_ID}")
    print(f"[*] Room / Location       : {ROOM if ROOM else '(unassigned)'}")
    print(f"[*] Sampling Cadence      : Every {SAMPLING_INTERVAL}s")
    print(f"[*] Flush Cadence         : Every {FLUSH_INTERVAL_SECONDS}s (or at {FLUSH_MAX_RECORDS} pending records)")
    print(f"[*] Spool Max Retention   : {SPOOL_MAX_RECORDS} records\n")

    # Initial flush attempt on startup if pending records exist from prior runs
    initial_pending = count()
    last_flush_failed = False
    if initial_pending > 0:
        print(f"[*] Found {initial_pending} pending record(s) in local spool. Attempting initial flush...")
        sent, failed = flush_spool()
        last_flush_failed = (failed > 0)

    last_collect_time = 0.0
    last_flush_time = time.time()

    while True:
        now = time.time()

        # 1. Collection cycle: collect telemetry and enqueue into durable spool
        if now - last_collect_time >= SAMPLING_INTERVAL:
            last_collect_time = now
            payload = build_telemetry_payload()
            enqueue(payload)
            pending = count()
            print(f"[{payload['timestamp']}] Telemetry collected (pending: {pending})")

        # 2. Flush cycle: flush spool if interval elapsed or pending threshold reached
        pending = count()
        time_since_flush = now - last_flush_time

        should_flush = False
        if pending > 0:
            if time_since_flush >= FLUSH_INTERVAL_SECONDS:
                should_flush = True
            elif pending >= FLUSH_MAX_RECORDS and not last_flush_failed:
                should_flush = True

        if should_flush:
            sent, failed = flush_spool()
            last_flush_time = time.time()
            last_flush_failed = (failed > 0)

        time.sleep(0.5)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[*] EdgeShield Client Agent stopped by user.")
