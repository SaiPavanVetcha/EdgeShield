import json
import os
import socket
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from config import (
    FLUSH_INTERVAL_SECONDS,
    FLUSH_MAX_RECORDS,
    HOST,
    PORT,
    SPOOL_MAX_RECORDS,
)
from database import get_last_flush_status, trigger_flush
from device_registry import counts as registry_counts, list_devices
from log_buffer import get_recent_logs
from runtime_config import (
    ALLOWED_STORAGE_MODES,
    get_storage_mode,
    is_databricks_configured,
    set_storage_mode,
)
from spool import count as spool_count, export_all as spool_export_all, get_db_path

router = APIRouter(prefix="/api/console", tags=["console"])

_SERVER_START_TIME = time.time()


def get_advertised_host(bind_host: str = HOST) -> str:
    """
    Detects the primary non-loopback IPv4 address for advertising to edge clients.
    Falls back to bind_host or 127.0.0.1 if no external interface is found.
    """
    if bind_host and bind_host not in ("0.0.0.0", "::", ""):
        return bind_host

    # Attempt to determine outgoing routing IP via a dummy UDP socket (does not send packets)
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        # 8.8.8.8 does not need to be reachable; the OS selects the interface based on routing table
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and not ip.startswith("127."):
            return ip
    except Exception:
        pass

    # Fallback via hostname lookup
    try:
        hostname = socket.gethostname()
        ip = socket.gethostbyname(hostname)
        if ip and not ip.startswith("127."):
            return ip
    except Exception:
        pass

    return "127.0.0.1"


class StorageModeRequest(BaseModel):
    mode: str = Field(..., description="'local' or 'databricks'")


def get_uptime_seconds() -> float:
    """Calculates server uptime in seconds."""
    return round(time.time() - _SERVER_START_TIME, 1)


@router.get("/status")
def get_console_status() -> Dict[str, Any]:
    """
    Returns real-time status of the ingestion server, including uptime,
    active storage mode, Databricks configuration state, spool metrics, devices,
    and detected primary advertised IPv4.
    """
    device_counts = registry_counts(online_within_seconds=120)
    current_storage_mode = get_storage_mode()
    db_configured = is_databricks_configured()
    pending_records = spool_count()
    last_flush = get_last_flush_status()
    advertised_host = get_advertised_host(HOST)
    advertised_url = f"http://{advertised_host}:{PORT}"

    return {
        "status": "online",
        "server_online": True,
        "host": HOST,
        "port": PORT,
        "listen_host": HOST,
        "listen_port": PORT,
        "advertised_host": advertised_host,
        "advertised_url": advertised_url,
        "uptime_seconds": get_uptime_seconds(),
        "storage_mode": current_storage_mode,
        "databricks_configured": db_configured,
        "pending": pending_records,
        "last_flush": last_flush,
        "spool": {
            "pending": pending_records,
            "max_records": SPOOL_MAX_RECORDS,
            "flush_interval_seconds": FLUSH_INTERVAL_SECONDS,
            "flush_max_records": FLUSH_MAX_RECORDS,
            "last_flush": last_flush,
        },
        "devices": device_counts,
    }


@router.get("/devices")
def get_console_devices() -> Dict[str, Any]:
    """
    Returns registered devices sorted by last_seen_utc descending,
    with dynamically evaluated online statuses.
    """
    devices = list_devices(online_within_seconds=120)
    online_count = sum(1 for d in devices if d.get("is_online"))
    return {
        "total": len(devices),
        "online": online_count,
        "devices": devices,
    }


@router.post("/storage-mode")
def update_storage_mode(payload: StorageModeRequest) -> Dict[str, Any]:
    """
    Persists and switches the server storage mode to 'local' or 'databricks'.
    """
    mode = payload.mode.strip().lower()
    if mode not in ALLOWED_STORAGE_MODES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid storage mode '{payload.mode}'. Must be one of: {sorted(ALLOWED_STORAGE_MODES)}",
        )

    try:
        updated_mode = set_storage_mode(mode)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to persist storage mode: {str(e)}")

    return {
        "status": "success",
        "storage_mode": updated_mode,
        "message": f"Storage mode switched to '{updated_mode}'.",
        "console_status": get_console_status(),
    }


@router.post("/flush")
def manual_flush() -> Dict[str, Any]:
    """
    Triggers an immediate flush cycle appropriate to the current storage mode.
    Returns flush outcome and pending record counts.
    """
    try:
        result = trigger_flush()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Flush cycle error: {str(e)}")


@router.get("/logs")
def get_console_logs(limit: int = Query(default=100, ge=1, le=500)) -> Dict[str, Any]:
    """
    Returns recent in-memory log entries from the server ring buffer.
    """
    logs = get_recent_logs(limit=limit)
    return {
        "total": len(logs),
        "limit": limit,
        "logs": logs,
    }


@router.get("/export")
def export_spool(format: str = Query(default="jsonl", description="'jsonl' or 'sqlite'")):
    """
    Downloads a snapshot of the local durable SQLite spool.
    Especially useful in local mode to inspect or archive telemetry.
    """
    fmt = (format or "jsonl").lower().strip()
    if fmt not in ("jsonl", "sqlite"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{format}'. Supported formats are 'jsonl' and 'sqlite'.",
        )

    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    if fmt == "sqlite":
        db_path = get_db_path()
        if not os.path.exists(db_path):
            raise HTTPException(status_code=404, detail="Spool database file does not exist")
        return FileResponse(
            db_path,
            media_type="application/x-sqlite3",
            filename=f"edgeshield_spool_{ts}.db",
        )

    # Export as jsonl
    records = spool_export_all()
    lines = [json.dumps(r) for r in records]
    content = "\n".join(lines) + ("\n" if lines else "")
    return Response(
        content=content,
        media_type="application/x-ndjson",
        headers={
            "Content-Disposition": f'attachment; filename="edgeshield_spool_{ts}.jsonl"',
            "Content-Type": "application/x-ndjson; charset=utf-8",
        },
    )
