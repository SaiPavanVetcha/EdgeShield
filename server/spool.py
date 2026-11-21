import functools
import json
import logging
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from config import SPOOL_DIR, SPOOL_MAX_RECORDS

logger = logging.getLogger("edgeshield.spool")
_db_initialized = False


def get_db_path() -> str:
    """Returns the full path to the SQLite server spool database file."""
    os.makedirs(SPOOL_DIR, exist_ok=True)
    return os.path.join(SPOOL_DIR, "server_spool.db")


def _recreate_corrupt_db(path: str, err: Exception) -> None:
    """Removes corrupt database files and recreates a clean spool database."""
    msg = f"Spool database at {path} was missing/corrupt ({err}). Recreating cleanly."
    logger.warning("[!] %s", msg)
    print(f"[!] Warning: {msg}")
    for ext in ("", "-wal", "-shm"):
        target = path + ext
        if os.path.exists(target):
            try:
                os.remove(target)
            except Exception as rm_err:
                logger.debug("Could not remove %s: %s", target, rm_err)
    init_db(path, force=True)


@contextmanager
def get_connection(db_path: Optional[str] = None):
    """Context manager for SQLite connections with WAL journal mode and auto-corruption recovery."""
    path = db_path or get_db_path()
    ensure_initialized(path)

    conn = None
    try:
        conn = sqlite3.connect(path, timeout=30.0)
        conn.execute("PRAGMA busy_timeout = 5000;")
        # Probe DB header and table existence to catch corruption immediately
        conn.execute("SELECT 1 FROM spool LIMIT 1;")
    except sqlite3.DatabaseError as err:
        if conn:
            try:
                conn.close()
            except Exception:
                pass
        _recreate_corrupt_db(path, err)
        conn = sqlite3.connect(path, timeout=30.0)
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout = 5000;")

    try:
        yield conn
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


def with_spool_retry(func):
    """Decorator to retry a database operation once after cleanly recreating if SQLite is corrupt."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except sqlite3.DatabaseError as err:
            path = get_db_path()
            _recreate_corrupt_db(path, err)
            return func(*args, **kwargs)
    return wrapper


def init_db(db_path: Optional[str] = None, force: bool = False) -> None:
    """Initializes the SQLite server spool database and creates required tables."""
    path = db_path or get_db_path()
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else ".", exist_ok=True)

    try:
        conn = sqlite3.connect(path, timeout=30.0)
        try:
            conn.execute("PRAGMA journal_mode=WAL;")
            conn.execute("PRAGMA busy_timeout = 5000;")
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS spool (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                );
                """
            )
            conn.commit()
        finally:
            conn.close()
    except sqlite3.DatabaseError as err:
        if not force:
            _recreate_corrupt_db(path, err)
        else:
            raise


def ensure_initialized(db_path: Optional[str] = None) -> None:
    """Ensures that the database schema is initialized at least once."""
    global _db_initialized
    if not _db_initialized:
        init_db(db_path)
        _db_initialized = True


@with_spool_retry
def enqueue(payload: Dict[str, Any]) -> int:
    """
    Appends a telemetry payload dictionary to the local durable spool.
    Trims oldest records if SPOOL_MAX_RECORDS > 0 and limit is exceeded.
    Returns the newly inserted record ID.
    """
    created_at = datetime.now(timezone.utc).isoformat()
    payload_json = json.dumps(payload)

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO spool (created_at, payload_json) VALUES (?, ?)",
            (created_at, payload_json),
        )
        conn.commit()
        record_id = cursor.lastrowid

    if SPOOL_MAX_RECORDS > 0:
        maybe_trim(SPOOL_MAX_RECORDS)
    return record_id


@with_spool_retry
def count() -> int:
    """Returns the total number of pending records in the spool."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM spool")
        row = cursor.fetchone()
        return row[0] if row else 0


@with_spool_retry
def fetch_batch(limit: int) -> List[Tuple[int, Dict[str, Any]]]:
    """
    Fetches up to `limit` oldest records from the spool in FIFO order.
    Returns a list of (id, payload_dict) tuples.
    Corrupted payloads are safely skipped and removed from the spool.
    """
    if limit <= 0:
        return []

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, payload_json FROM spool ORDER BY id ASC LIMIT ?",
            (limit,),
        )
        rows = cursor.fetchall()

    batch: List[Tuple[int, Dict[str, Any]]] = []
    corrupted_ids: List[int] = []

    for row_id, payload_json in rows:
        try:
            payload = json.loads(payload_json)
            batch.append((row_id, payload))
        except (json.JSONDecodeError, TypeError) as err:
            logger.warning("[!] Corrupted spool record id=%s dropped: %s", row_id, err)
            print(f"[!] Warning: Corrupted spool record id={row_id} dropped: {err}")
            corrupted_ids.append(row_id)

    if corrupted_ids:
        delete_ids(corrupted_ids)

    return batch


@with_spool_retry
def delete_ids(ids: List[int]) -> int:
    """
    Deletes records matching the specified IDs from the spool.
    Returns the number of deleted records.
    """
    if not ids:
        return 0

    placeholders = ",".join("?" for _ in ids)
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(f"DELETE FROM spool WHERE id IN ({placeholders})", ids)
        conn.commit()
        return cursor.rowcount


@with_spool_retry
def maybe_trim(max_records: int = SPOOL_MAX_RECORDS) -> int:
    """
    If the spool exceeds max_records, drops the oldest records.
    If max_records <= 0, trimming is disabled (unlimited retention).
    Returns the number of dropped records.
    """
    if max_records <= 0:
        return 0

    total = count()
    if total <= max_records:
        return 0

    excess = total - max_records
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            DELETE FROM spool
            WHERE id IN (
                SELECT id FROM spool
                ORDER BY id ASC
                LIMIT ?
            )
            """,
            (excess,),
        )
        conn.commit()
        dropped = cursor.rowcount

    msg = f"Server spool exceeded {max_records} records. Dropped {dropped} oldest record(s)."
    logger.warning("[!] %s", msg)
    print(f"[!] Warning: {msg}")
    return dropped


@with_spool_retry
def export_all() -> List[Dict[str, Any]]:
    """
    Returns all records currently in the spool in FIFO order.
    Returns a list of dicts with id, created_at, and parsed payload.
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, created_at, payload_json FROM spool ORDER BY id ASC")
        rows = cursor.fetchall()

    records: List[Dict[str, Any]] = []
    for row_id, created_at, payload_json in rows:
        try:
            payload = json.loads(payload_json)
        except Exception:
            payload = {"raw_payload": payload_json}
        records.append({
            "id": row_id,
            "created_at": created_at,
            "payload": payload,
        })
    return records
