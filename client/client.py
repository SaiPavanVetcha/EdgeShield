import logging
from logging.handlers import RotatingFileHandler
import os
import socket
import time
from datetime import datetime, timezone
from typing import Optional, Tuple
import requests

from config import (
    DEVICE_ID,
    FLUSH_INTERVAL_SECONDS,
    FLUSH_MAX_RECORDS,
    LOG_DIR,
    LOG_FILE,
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

# Configure dual logging: console + rotating log file
logger = logging.getLogger("edgeshield_client")

# HTTP Session management & failure throttling
_session: Optional[requests.Session] = None
_consecutive_failures: int = 0
_FAILURE_LOG_INTERVAL: int = 10  # Log initial failure, then every 10th retry


def setup_logging() -> logging.Logger:
    """Configures console and rotating file logging for the client agent."""
    os.makedirs(LOG_DIR, exist_ok=True)
    logger.setLevel(logging.INFO)

    if not logger.handlers:
        formatter = logging.Formatter("%(message)s")

        # Console Stream Handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

        # Rotating File Handler (max 5 MB per file, up to 3 backups)
        file_handler = RotatingFileHandler(
            LOG_FILE,
            maxBytes=5 * 1024 * 1024,
            backupCount=3,
            encoding="utf-8",
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    return logger


def log(message: str) -> None:
    """Logs message to both console and client log file."""
    logger.info(message)


def get_session() -> requests.Session:
    """
    Returns the active HTTP session, instantiating a fresh one if closed.
    Ensures connection pools and DNS resolution are fresh after network changes.
    """
    global _session
    if _session is None:
        _session = requests.Session()
    return _session


def close_session() -> None:
    """
    Closes and discards the active HTTP session.
    Tears down underlying urllib3 sockets and connection pools so the host is
    re-resolved on the next request (prevents sticky broken sockets after Wi-Fi switches).
    """
    global _session
    if _session is not None:
        try:
            _session.close()
        except Exception:
            pass
        _session = None


def build_telemetry_payload() -> dict:
    """Aggregates all collector module outputs into a single JSON payload."""
    try:
        hostname = socket.gethostname()
    except Exception:
        hostname = "unknown-host"

    return {
        "device_id": DEVICE_ID,
        "hostname": hostname,
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
    On connection drops, timeouts, or network switches, resets the session
    so DNS and sockets are cleanly re-established on the next attempt.
    Throttles failure logging to prevent console flooding.
    Returns True if successfully received (HTTP 2xx), False otherwise.
    """
    global _consecutive_failures
    session = get_session()

    try:
        response = session.post(SERVER_URL, json=payload, timeout=4)
        response.raise_for_status()

        if _consecutive_failures > 0:
            log(f"[*] Connection restored to {SERVER_URL}. Resuming spool drain.")
            _consecutive_failures = 0

        return True

    except requests.exceptions.Timeout:
        close_session()
        _consecutive_failures += 1
        if _consecutive_failures == 1:
            log(f"[!] Server unreachable at {SERVER_URL} (Timeout). Spooling telemetry locally.")
        elif _consecutive_failures % _FAILURE_LOG_INTERVAL == 0:
            log(f"[!] Still unreachable at {SERVER_URL} (retry #{_consecutive_failures}; pending spool: {count()})")
        return False

    except requests.exceptions.ConnectionError:
        close_session()
        _consecutive_failures += 1
        if _consecutive_failures == 1:
            log(f"[!] Server unreachable at {SERVER_URL} (Connection Refused / Network Down). Spooling telemetry locally.")
        elif _consecutive_failures % _FAILURE_LOG_INTERVAL == 0:
            log(f"[!] Still unreachable at {SERVER_URL} (retry #{_consecutive_failures}; pending spool: {count()})")
        return False

    except requests.exceptions.RequestException as err:
        close_session()
        _consecutive_failures += 1
        if _consecutive_failures == 1:
            log(f"[!] Transmission Error to {SERVER_URL}: {err}. Spooling telemetry locally.")
        elif _consecutive_failures % _FAILURE_LOG_INTERVAL == 0:
            log(f"[!] Still failing transmission to {SERVER_URL} (retry #{_consecutive_failures}; pending spool: {count()})")
        return False


def flush_spool() -> Tuple[int, int]:
    """
    Drains pending records from the local durable spool and POSTs them to the server.
    Sends one record per HTTP request. Aborts immediately on the first network failure
    to preserve remaining spool records without hammering the network.
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
    if total_sent > 0:
        log(f"[{timestamp}] Spool flush: {total_sent} sent successfully (pending: {remaining})")

    return total_sent, total_failed


def main():
    setup_logging()

    log("[*] Modular EdgeShield Client Agent Initialized (Durable Spool Mode)")
    log(f"[*] Target Endpoint       : {SERVER_URL}")
    log(f"[*] Device Identity       : {DEVICE_ID}")
    log(f"[*] Room / Location       : {ROOM if ROOM else '(unassigned)'}")
    log(f"[*] Sampling Cadence      : Every {SAMPLING_INTERVAL}s")
    log(f"[*] Flush Cadence         : Every {FLUSH_INTERVAL_SECONDS}s (or at {FLUSH_MAX_RECORDS} pending records)")
    log(f"[*] Spool Max Retention   : {SPOOL_MAX_RECORDS} records")
    log(f"[*] Log Output File       : {os.path.abspath(LOG_FILE)}\n")

    # Initial flush attempt on startup if pending records exist from prior runs
    initial_pending = count()
    last_flush_failed = False
    if initial_pending > 0:
        log(f"[*] Found {initial_pending} pending record(s) in local spool. Attempting initial flush...")
        sent, failed = flush_spool()
        last_flush_failed = (failed > 0)

    last_collect_time = 0.0
    last_flush_time = time.time()
    flush_backoff_seconds = FLUSH_INTERVAL_SECONDS

    while True:
        try:
            now = time.time()

            # 1. Collection cycle: collect telemetry and enqueue into durable spool
            # Network failures never halt local collection
            if now - last_collect_time >= SAMPLING_INTERVAL:
                last_collect_time = now
                try:
                    payload = build_telemetry_payload()
                    enqueue(payload)
                    pending = count()
                    log(f"[{payload['timestamp']}] Telemetry collected (pending: {pending})")
                except Exception as col_err:
                    log(f"[!] Error during telemetry collection: {col_err}")

            # 2. Flush cycle: flush spool if interval elapsed or pending threshold reached
            pending = count()
            time_since_flush = now - last_flush_time

            # Use adaptive backoff when network is failing to avoid aggressive socket churn
            current_interval = flush_backoff_seconds if last_flush_failed else FLUSH_INTERVAL_SECONDS

            should_flush = False
            if pending > 0:
                if time_since_flush >= current_interval:
                    should_flush = True
                elif pending >= FLUSH_MAX_RECORDS and not last_flush_failed:
                    should_flush = True

            if should_flush:
                sent, failed = flush_spool()
                last_flush_time = time.time()
                last_flush_failed = (failed > 0)

                if last_flush_failed:
                    # Exponential backoff up to 30s maximum
                    flush_backoff_seconds = min(30.0, max(flush_backoff_seconds * 1.5, FLUSH_INTERVAL_SECONDS))
                else:
                    flush_backoff_seconds = FLUSH_INTERVAL_SECONDS

        except Exception as loop_err:
            log(f"[!] Unexpected error in client main loop (resuming): {loop_err}")

        time.sleep(0.5)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        close_session()
        log("\n[*] EdgeShield Client Agent stopped by user.")
