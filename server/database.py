import os
import threading
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
from databricks import sql
from dotenv import load_dotenv

from config import (
    DATABRICKS_HOST,
    DATABRICKS_HTTP_PATH,
    DATABRICKS_TOKEN,
    FLUSH_INTERVAL_SECONDS,
    FLUSH_MAX_RECORDS,
)
from runtime_config import get_storage_mode
from spool import count, delete_ids, enqueue, fetch_batch

load_dotenv()

# Worker thread and synchronization
_worker_thread: Optional[threading.Thread] = None
_stop_event = threading.Event()
_last_flush_status: Dict[str, Any] = {
    "timestamp": None,
    "inserted": 0,
    "failed": 0,
    "success": None,
}


def get_connection():
    """
    Establishes connection to Databricks SQL Warehouse with transaction support.
    Passes ignore_transactions=False so PEP 249 commit() and rollback() can be used.
    """
    kwargs = {
        "server_hostname": DATABRICKS_HOST,
        "http_path": DATABRICKS_HTTP_PATH,
        "access_token": DATABRICKS_TOKEN,
    }
    try:
        return sql.connect(ignore_transactions=False, **kwargs)
    except TypeError:
        return sql.connect(**kwargs)


def init_connection_transactions(connection) -> bool:
    """
    Configures the connection for transactional mode (autocommit=False).
    Returns True if transaction management is supported and enabled, False otherwise.
    """
    if getattr(connection, "ignore_transactions", True):
        return False
    try:
        connection.autocommit = False
        return True
    except Exception as e:
        print(f"[*] Databricks autocommit=False could not be set ({e}); falling back to non-transactional execution.")
        return False


_has_room_column: Optional[bool] = None


def insert_single_payload(cursor, payload: Dict[str, Any], connection: Optional[Any] = None) -> None:
    """Executes Databricks SQL INSERT statements for a single telemetry payload."""
    global _has_room_column

    event_id = str(uuid.uuid4())
    device_id = payload.get("device_id")
    hostname = payload.get("hostname")
    raw_room = payload.get("room")
    # Normalize empty or whitespace-only room to None (SQL NULL)
    room = str(raw_room).strip() if (raw_room is not None and str(raw_room).strip() != "") else None
    timestamp = datetime.now(timezone.utc).isoformat()

    metrics = payload.get("metrics", {}) or {}

    system = metrics.get("system") or {}
    cpu = metrics.get("cpu") or {}
    ram = metrics.get("ram") or {}
    disk = metrics.get("disk") or {}
    battery = metrics.get("battery") or {}
    dht_data = metrics.get("dht11") or metrics.get("dht22") or {}

    # 1. System metrics
    if system:
        if _has_room_column is False:
            cursor.execute(
                """
                INSERT INTO edgeshield_db.system_metrics 
                (event_id, device_id, hostname, timestamp, platform, boot_time_utc)
                VALUES (?, ?, ?, CAST(? AS TIMESTAMP), ?, CAST(? AS TIMESTAMP))
                """,
                (
                    event_id,
                    device_id,
                    hostname,
                    timestamp,
                    system.get("platform"),
                    system.get("boot_time_utc"),
                ),
            )
        else:
            try:
                cursor.execute(
                    """
                    INSERT INTO edgeshield_db.system_metrics 
                    (event_id, device_id, hostname, room, timestamp, platform, boot_time_utc)
                    VALUES (?, ?, ?, ?, CAST(? AS TIMESTAMP), ?, CAST(? AS TIMESTAMP))
                    """,
                    (
                        event_id,
                        device_id,
                        hostname,
                        room,
                        timestamp,
                        system.get("platform"),
                        system.get("boot_time_utc"),
                    ),
                )
                _has_room_column = True
            except Exception as e:
                # Fallback for environments where the 'room' column migration has not been applied yet
                err_msg = str(e).lower()
                if "room" in err_msg or "column" in err_msg or "cannot be resolved" in err_msg:
                    _has_room_column = False
                    if connection and getattr(connection, "autocommit", True) is False:
                        try:
                            connection.rollback()
                        except Exception:
                            pass
                    cursor.execute(
                        """
                        INSERT INTO edgeshield_db.system_metrics 
                        (event_id, device_id, hostname, timestamp, platform, boot_time_utc)
                        VALUES (?, ?, ?, CAST(? AS TIMESTAMP), ?, CAST(? AS TIMESTAMP))
                        """,
                        (
                            event_id,
                            device_id,
                            hostname,
                            timestamp,
                            system.get("platform"),
                            system.get("boot_time_utc"),
                        ),
                    )
                else:
                    raise

    # 2. CPU metrics
    if cpu:
        cursor.execute(
            """
            INSERT INTO edgeshield_db.cpu_metrics 
            (event_id, device_id, timestamp, utilization_percent, logical_cores, 
             physical_cores, frequency_current_mhz, frequency_max_mhz)
            VALUES (?, ?, CAST(? AS TIMESTAMP), ?, ?, ?, ?, ?)
            """,
            (
                event_id,
                device_id,
                timestamp,
                cpu.get("utilization_percent"),
                cpu.get("logical_cores"),
                cpu.get("physical_cores"),
                cpu.get("frequency_current_mhz"),
                cpu.get("frequency_max_mhz"),
            ),
        )

    # 3. RAM metrics
    if ram:
        cursor.execute(
            """
            INSERT INTO edgeshield_db.ram_metrics 
            (event_id, device_id, timestamp, total_bytes, used_bytes, available_bytes, 
             utilization_percent, available_mb)
            VALUES (?, ?, CAST(? AS TIMESTAMP), ?, ?, ?, ?, ?)
            """,
            (
                event_id,
                device_id,
                timestamp,
                ram.get("total_bytes"),
                ram.get("used_bytes"),
                ram.get("available_bytes"),
                ram.get("utilization_percent"),
                ram.get("available_mb"),
            ),
        )

    # 4. Disk metrics
    if disk:
        cursor.execute(
            """
            INSERT INTO edgeshield_db.disk_metrics 
            (event_id, device_id, timestamp, mount_point, total_bytes, used_bytes, 
             free_bytes, free_gb, utilization_percent, read_bytes, write_bytes)
            VALUES (?, ?, CAST(? AS TIMESTAMP), ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                event_id,
                device_id,
                timestamp,
                disk.get("mount_point"),
                disk.get("total_bytes"),
                disk.get("used_bytes"),
                disk.get("free_bytes"),
                disk.get("free_gb"),
                disk.get("utilization_percent"),
                disk.get("read_bytes"),
                disk.get("write_bytes"),
            ),
        )

    # 5. Battery metrics
    if battery:
        cursor.execute(
            """
            INSERT INTO edgeshield_db.battery_metrics 
            (event_id, device_id, timestamp, present, percent, power_plugged, 
             design_capacity_raw, full_charge_capacity_raw, health_percentage)
            VALUES (?, ?, CAST(? AS TIMESTAMP), ?, ?, ?, ?, ?, ?)
            """,
            (
                event_id,
                device_id,
                timestamp,
                battery.get("present"),
                battery.get("percent"),
                battery.get("power_plugged"),
                battery.get("design_capacity_raw"),
                battery.get("full_charge_capacity_raw"),
                battery.get("health_percentage"),
            ),
        )

    # 6. Environment metrics (ESP32)
    if dht_data:
        cursor.execute(
            """
            INSERT INTO edgeshield_db.environment_metrics
            (event_id, device_id, timestamp, temperature_c, humidity_percent)
            VALUES (?, ?, CAST(? AS TIMESTAMP), ?, ?)
            """,
            (
                event_id,
                device_id,
                timestamp,
                dht_data.get("temperature_c"),
                dht_data.get("humidity_percent"),
            ),
        )


def flush_spool_to_databricks() -> Tuple[int, int]:
    """
    Drains pending records from the local durable spool and inserts them into Databricks.
    Inserts for each payload are executed inside an atomic transaction (all-or-nothing).
    Removes records from the spool ONLY upon successful transaction commit.
    On failure: rolls back partial writes, retains the record in the spool, logs clearly,
    and aborts the batch to prevent further errors while preserving unwritten records for retry.
    Returns (sent_count, failed_count).
    """
    global _last_flush_status

    pending = count()
    if pending == 0:
        return 0, 0

    mode = get_storage_mode()
    if mode == "local":
        _last_flush_status = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "inserted": 0,
            "failed": 0,
            "success": True,
            "mode": "local",
            "message": "Storage mode is local; cloud flush skipped (spool retained on disk)",
        }
        return 0, 0

    if not DATABRICKS_HOST or not DATABRICKS_HTTP_PATH or not DATABRICKS_TOKEN:
        print("[!] Databricks credentials not configured; spool records retained.")
        _last_flush_status = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "inserted": 0,
            "failed": pending,
            "success": False,
            "error": "Databricks credentials not configured",
        }
        return 0, pending

    total_sent = 0
    total_failed = 0
    connection = None

    try:
        connection = get_connection()
        supports_tx = init_connection_transactions(connection)
        cursor = connection.cursor()

        while True:
            batch = fetch_batch(limit=FLUSH_MAX_RECORDS)
            if not batch:
                break

            batch_aborted = False
            for record_id, payload in batch:
                try:
                    # 1. Execute all conditional inserts for this payload
                    insert_single_payload(cursor, payload, connection=connection)

                    # 2. Commit transaction atomically across all inserts for this payload
                    if supports_tx:
                        connection.commit()

                    # 3. Only remove from durable spool AFTER full payload transaction succeeds
                    delete_ids([record_id])
                    total_sent += 1
                except Exception as rec_err:
                    # 4. Rollback uncommitted inserts for this payload on failure
                    if supports_tx:
                        try:
                            connection.rollback()
                        except Exception as rb_err:
                            print(f"[!] Warning: transaction rollback failed for record id={record_id}: {rb_err}")

                    # 5. Leave record in spool, log clearly, abort batch per safe retry design
                    print(
                        f"[!] Error inserting record id={record_id} to Databricks "
                        f"(transaction {'rolled back' if supports_tx else 'aborted'}; "
                        f"record retained in spool for retry): {rec_err}"
                    )
                    total_failed += 1
                    batch_aborted = True
                    break

            if batch_aborted:
                break

        _last_flush_status = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "inserted": total_sent,
            "failed": total_failed,
            "success": (total_failed == 0),
        }

    except Exception as conn_err:
        print(f"[!] Databricks connection/flush failed: {conn_err}")
        total_failed += 1
        _last_flush_status = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "inserted": total_sent,
            "failed": total_failed,
            "success": False,
            "error": str(conn_err),
        }

    finally:
        if connection:
            try:
                connection.close()
            except Exception:
                pass

    remaining = count()
    if total_sent > 0 or total_failed > 0:
        timestamp = datetime.now(timezone.utc).isoformat()
        print(f"[{timestamp}] Databricks flush: {total_sent} inserted, {total_failed} failed (pending: {remaining})")

    return total_sent, total_failed


def _spool_flush_worker():
    """Background worker thread draining the SQLite spool into Databricks."""
    last_flush_time = time.time()
    last_flush_failed = False

    while not _stop_event.is_set():
        now = time.time()
        time_since_flush = now - last_flush_time
        pending = count()

        should_flush = False
        if pending > 0:
            if time_since_flush >= FLUSH_INTERVAL_SECONDS:
                should_flush = True
            elif pending >= FLUSH_MAX_RECORDS and not last_flush_failed:
                should_flush = True

        if should_flush:
            mode = get_storage_mode()
            if mode == "local":
                # In local storage mode, skip cloud flush; records remain durable in SQLite spool
                _last_flush_status = {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "inserted": 0,
                    "failed": 0,
                    "success": True,
                    "mode": "local",
                    "message": "Storage mode is local; cloud flush skipped (spool retained on disk)",
                }
                last_flush_time = time.time()
                last_flush_failed = False
            else:
                sent, failed = flush_spool_to_databricks()
                last_flush_time = time.time()
                last_flush_failed = (failed > 0)

        # Sleep briefly to promptly respond to shutdown event
        _stop_event.wait(timeout=0.5)


def trigger_flush() -> Dict[str, Any]:
    """
    Triggers one flush cycle appropriate to the active storage mode.
    Returns operational summary including inserted, failed, pending count, mode, and last flush detail.
    """
    mode = get_storage_mode()
    pending = count()

    if mode == "local":
        status_info = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "inserted": 0,
            "failed": 0,
            "success": True,
            "mode": "local",
            "message": "Storage mode is local; records retained in spool without cloud sync.",
        }
        global _last_flush_status
        _last_flush_status = status_info
        return {
            "status": "success",
            "mode": "local",
            "inserted": 0,
            "failed": 0,
            "pending": pending,
            "message": "Storage mode is local; spool records retained durably on disk.",
            "last_flush": dict(status_info),
        }

    sent, failed = flush_spool_to_databricks()
    remaining = count()
    success = (failed == 0)
    return {
        "status": "success" if success else "error",
        "mode": "databricks",
        "inserted": sent,
        "failed": failed,
        "pending": remaining,
        "message": (
            f"Databricks flush completed: {sent} inserted, {failed} failed."
            if success
            else f"Databricks flush encountered failures ({failed} records retained in spool)."
        ),
        "last_flush": get_last_flush_status(),
    }



def start_flush_worker():
    """Starts the background spool flush worker thread."""
    global _worker_thread, _stop_event
    if _worker_thread is None or not _worker_thread.is_alive():
        _stop_event.clear()
        _worker_thread = threading.Thread(target=_spool_flush_worker, daemon=True)
        _worker_thread.start()
        print("[*] Spool flush worker thread started.")


def stop_flush_worker():
    """Gracefully signals the background flush worker thread to stop."""
    global _stop_event, _worker_thread
    _stop_event.set()
    if _worker_thread and _worker_thread.is_alive():
        _worker_thread.join(timeout=2.0)
    print("[*] Spool flush worker thread stopped.")


def get_last_flush_status() -> Dict[str, Any]:
    """Returns metadata regarding the most recent Databricks flush attempt."""
    return dict(_last_flush_status)


def insert_telemetry_to_databricks(payload: dict):
    """
    Backward-compatible wrapper: enqueues incoming telemetry into the durable SQLite spool.
    """
    enqueue(payload)
